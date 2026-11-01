import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addCartLines,
  createCart,
  estimateCartShipping,
  getAvailableVariant,
  getCart,
  removeCartLines,
  selectCartShippingOption,
  updateCart,
  type Product,
  type ShippingRate,
} from "@/lib/store";
import { getBrowserId, getCartStorageKey } from "@/lib/browserIdentity";
import { useStoreAccount } from "@/hooks/useStoreAccount";

type Money = { amount: string; currencyCode: string };
type CartLine = {
  id: string;
  quantity: number;
  product: {
    id: string;
    handle: string;
    name: string;
    image: { url: string; altText: string | null } | null;
    price: Money;
    variantTitle: string;
  };
};
type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  lines: { nodes: any[] };
  cost?: { subtotalAmount?: Money | null } | null;
};
type CartContextValue = {
  cart: ShopifyCart | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money | null;
  shippingRates: ShippingRate[];
  shippingBusy: boolean;
  shippingError: string | null;
  estimateShipping: (address: { countryCode: string; postalCode: string }) => Promise<boolean>;
  selectShippingRate: (rateId: string) => Promise<boolean>;
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  addItem: (product: Product, variantId?: string, quantity?: number) => Promise<boolean>;
  addItems: (products: Product[]) => Promise<boolean>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  checkout: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isMissingCartError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /cart.{0,80}(does not exist|not found|invalid|no longer exists)|does not exist/i.test(message);
}

function readStoredCart(key: string): ShopifyCart | null {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as ShopifyCart;
    if (typeof parsed?.id !== "string" || !Array.isArray(parsed?.lines?.nodes)) return null;
    return parsed;
  } catch {
    try { localStorage.removeItem(key); } catch {}
    return null;
  }
}

function mergeCartLines(
  existing: ShopifyCart | null,
  incoming: { merchandiseId: string; quantity: number }[],
) {
  const quantities = new Map<string, number>();
  for (const line of existing?.lines?.nodes ?? []) {
    const id = line.merchandise?.id;
    if (id) quantities.set(id, (quantities.get(id) ?? 0) + line.quantity);
  }
  for (const line of incoming) {
    quantities.set(line.merchandiseId, (quantities.get(line.merchandiseId) ?? 0) + line.quantity);
  }
  return Array.from(quantities.entries()).map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

function normalizeCart(cart: ShopifyCart | null): CartLine[] {
  return (cart?.lines?.nodes ?? []).flatMap((line: any) => {
    const variant = line?.merchandise;
    const product = variant?.product;
    const quantity = Number(line?.quantity);
    if (!line?.id || !variant?.id || !product?.handle || !Number.isFinite(quantity) || quantity < 1) return [];
    return [{
      id: line.id,
      quantity,
      product: {
        id: variant.id,
        handle: product.handle,
        name: product.title || "Product",
        image: product.featuredImage ?? null,
        price: variant.price ?? { amount: "", currencyCode: "USD" },
        variantTitle: variant.title || "",
      },
    }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { profile } = useStoreAccount();
  const [browserId] = useState(() => getBrowserId());
  const storageScope = useMemo(() => getCartStorageKey(browserId, profile?.uid), [browserId, profile?.uid]);
  const [cartState, setCartState] = useState<{ scope: string; cart: ShopifyCart | null }>(() => ({
    scope: storageScope,
    cart: readStoredCart(storageScope),
  }));
  const activeScopeRef = useRef(storageScope);
  activeScopeRef.current = storageScope;
  const writeVersionRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingBusy, setShippingBusy] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const cart = cartState.scope === storageScope ? cartState.cart : null;

  const commitCart = (scope: string, nextCart: ShopifyCart | null) => {
    writeVersionRef.current += 1;
    try {
      if (nextCart) localStorage.setItem(scope, JSON.stringify(nextCart));
      else localStorage.removeItem(scope);
    } catch {}
    if (activeScopeRef.current === scope) {
      setCartState({ scope, cart: nextCart });
      setShippingRates([]);
      setShippingError(null);
    }
  };

  useEffect(() => {
    const saved = readStoredCart(storageScope);
    setCartState({ scope: storageScope, cart: saved });
    setError(null);
    setShippingRates([]);
    setShippingError(null);
    if (!saved?.id) return;

    const startingVersion = writeVersionRef.current;
    let cancelled = false;
    void getCart(saved.id).then((freshCart) => {
      if (!cancelled && writeVersionRef.current === startingVersion) commitCart(storageScope, freshCart);
    }).catch((cause) => {
      if (cancelled || writeVersionRef.current !== startingVersion) return;
      if (isMissingCartError(cause)) commitCart(storageScope, null);
      // On a transient network failure keep the locally saved cart visible and usable.
    });
    return () => { cancelled = true; };
  }, [storageScope]);

  const lines = useMemo(() => normalizeCart(cart), [cart]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = useMemo(() => {
    const remote = cart?.cost?.subtotalAmount;
    const remoteAmount = Number(remote?.amount);
    const itemAmount = lines.reduce((sum, line) => sum + Number(line.product.price.amount || 0) * line.quantity, 0);
    const currencyCode = lines.find((line) => line.product.price.currencyCode)?.product.price.currencyCode || remote?.currencyCode || "USD";
    // A missing/zero Shopify subtotal can occur in stale persisted carts; show the live line-price total instead.
    if ((!remote || !Number.isFinite(remoteAmount) || remoteAmount === 0) && itemAmount > 0) {
      return { amount: itemAmount.toFixed(2), currencyCode };
    }
    return remote ?? (lines.length ? { amount: itemAmount.toFixed(2), currencyCode } : null);
  }, [cart, lines]);

  const run = async (
    scope: string,
    operation: () => Promise<ShopifyCart>,
    recoverMissingCart?: () => Promise<ShopifyCart>,
  ): Promise<boolean> => {
    setBusy(true);
    if (activeScopeRef.current === scope) setError(null);
    try {
      commitCart(scope, await operation());
      return true;
    } catch (cause) {
      if (isMissingCartError(cause)) {
        if (recoverMissingCart) {
          try {
            commitCart(scope, await recoverMissingCart());
            return true;
          } catch (recoveryCause) {
            commitCart(scope, null);
            if (activeScopeRef.current === scope) setError(recoveryCause instanceof Error ? recoveryCause.message : "Unable to restore your cart. Please try again.");
            return false;
          }
        }
        commitCart(scope, null);
      }
      if (activeScopeRef.current === scope) setError(cause instanceof Error ? cause.message : "Unable to update your bag.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (product: Product, variantId?: string, quantity = 1): Promise<boolean> => {
    const scope = storageScope;
    const selectedVariant = variantId
      ? product.variants.find((variant) => variant.id === variantId && variant.availableForSale)
      : getAvailableVariant(product);
    if (!selectedVariant) {
      setError("This product is not currently available.");
      setIsOpen(true);
      return false;
    }
    if (busy) {
      setError("Your cart is updating. Please wait and try again.");
      setIsOpen(true);
      return false;
    }

    const selectedVariantId = selectedVariant.id;
    setIsOpen(true);
    const recoverMissingCart = () => createCart(mergeCartLines(cart, [{ merchandiseId: selectedVariantId, quantity }]));
    if (cart && lines.some((line) => line.product.id === selectedVariantId)) {
      return run(scope, () => updateCart(cart.id, lines.map((line) => ({
        id: line.id,
        quantity: line.product.id === selectedVariantId ? line.quantity + quantity : line.quantity,
      }))), recoverMissingCart);
    }
    if (cart) return run(scope, () => addCartLines(cart.id, [{ merchandiseId: selectedVariantId, quantity }]), recoverMissingCart);
    return run(scope, () => createCart(selectedVariantId, quantity));
  };

  const addItems = async (products: Product[]): Promise<boolean> => {
    const scope = storageScope;
    const merchandise = products.flatMap((product) => {
      const variant = getAvailableVariant(product);
      return variant ? [{ merchandiseId: variant.id, quantity: 1 }] : [];
    });
    if (!merchandise.length || busy) return false;

    setIsOpen(true);
    setBusy(true);
    setError(null);
    try {
      let nextCart: ShopifyCart;
      if (cart) {
        nextCart = await addCartLines(cart.id, merchandise);
      } else {
        nextCart = await createCart(merchandise[0].merchandiseId, merchandise[0].quantity);
        if (merchandise.length > 1) nextCart = await addCartLines(nextCart.id, merchandise.slice(1));
      }
      commitCart(scope, nextCart);
      return true;
    } catch (cause) {
      if (isMissingCartError(cause) && cart) {
        try {
          commitCart(scope, await createCart(mergeCartLines(cart, merchandise)));
          return true;
        } catch (recoveryCause) {
          commitCart(scope, null);
          if (activeScopeRef.current === scope) setError(recoveryCause instanceof Error ? recoveryCause.message : "Unable to restore your cart. Please try again.");
          return false;
        }
      }
      if (isMissingCartError(cause)) commitCart(scope, null);
      if (activeScopeRef.current === scope) setError(cause instanceof Error ? cause.message : "Unable to add the shopping list to your cart.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    if (quantity <= 0) return removeItem(lineId);
    const scope = storageScope;
    await run(scope, () => updateCart(cart.id, lines.map((line) => ({
      id: line.id,
      quantity: line.id === lineId ? quantity : line.quantity,
    }))));
  };

  const removeItem = async (lineId: string) => {
    if (!cart) return;
    const scope = storageScope;
    await run(scope, () => removeCartLines(cart.id, [lineId]));
  };

  const estimateShipping = async (address: { countryCode: string; postalCode: string }) => {
    if (!cart?.id) return false;
    setShippingBusy(true);
    setShippingError(null);
    setShippingRates([]);
    try {
      const rates = await estimateCartShipping(cart.id, address);
      setShippingRates(rates);
      if (!rates.length) setShippingError("No shipping rates were returned for that destination. Checkout can confirm available options.");
      if (rates[0]) {
        try {
          await selectCartShippingOption(cart.id, rates[0]);
        } catch {
          setShippingError("Rates were fetched, but Shopify could not save the selected option. Checkout will confirm delivery.");
        }
      }
      return Boolean(rates.length);
    } catch (cause) {
      setShippingError(cause instanceof Error ? cause.message : "Shipping rates are temporarily unavailable. Checkout will confirm delivery options.");
      return false;
    } finally {
      setShippingBusy(false);
    }
  };

  const selectShippingRate = async (rateId: string) => {
    const rate = shippingRates.find((item) => item.id === rateId);
    if (!cart?.id || !rate) return false;
    setShippingBusy(true);
    setShippingError(null);
    try {
      await selectCartShippingOption(cart.id, rate);
      return true;
    } catch (cause) {
      setShippingError(cause instanceof Error ? cause.message : "Unable to save that shipping option. Checkout will confirm delivery.");
      return false;
    } finally {
      setShippingBusy(false);
    }
  };

  const checkout = () => {
    const checkoutUrl = cart?.checkoutUrl;
    if (!checkoutUrl) {
      setError("Unable to proceed to checkout. Please check your cart items or refresh.");
      return;
    }
    window.location.href = checkoutUrl;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        lines,
        itemCount,
        subtotal,
        shippingRates,
        shippingBusy,
        shippingError,
        estimateShipping,
        selectShippingRate,
        isOpen,
        busy,
        error,
        addItem,
        addItems,
        updateQuantity,
        removeItem,
        checkout,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        toggleCart: () => setIsOpen((value) => !value),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
