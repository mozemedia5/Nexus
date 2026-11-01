import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addCartLines,
  createCart,
  getAvailableVariant,
  getCart,
  removeCartLines,
  updateCart,
  type Product,
} from "@/lib/store";

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
  cost: { subtotalAmount: Money };
};
type CartContextValue = {
  cart: ShopifyCart | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money | null;
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
const STORAGE_KEY = "liverton-shopify-cart";
const CartContext = createContext<CartContextValue | null>(null);

function isMissingCartError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /cart.{0,60}(does not exist|not found|invalid)|does not exist/i.test(message);
}
function mergeCartLines(
  existing: ShopifyCart | null,
  incoming: { merchandiseId: string; quantity: number }[],
) {
  const quantities = new Map<string, number>();
  for (const line of existing?.lines?.nodes ?? []) {
    const id = line.merchandise?.id;
    if (id && Number.isInteger(line.quantity) && line.quantity > 0) {
      quantities.set(id, (quantities.get(id) ?? 0) + line.quantity);
    }
  }
  for (const line of incoming) {
    quantities.set(line.merchandiseId, (quantities.get(line.merchandiseId) ?? 0) + line.quantity);
  }
  return Array.from(quantities.entries()).map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}
function normalizeCart(cart: ShopifyCart | null): CartLine[] {
  return (cart?.lines?.nodes ?? []).map((line: any) => ({
    id: line.id,
    quantity: line.quantity,
    product: {
      id: line.merchandise.id,
      handle: line.merchandise.product.handle,
      name: line.merchandise.product.title,
      image: line.merchandise.product.featuredImage,
      price: line.merchandise.price,
      variantTitle: line.merchandise.title,
    },
  }));
}
function validQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 250;
}
function hasInvalidOrZeroPrice(lines: CartLine[]) {
  return lines.some((line) => !Number.isFinite(Number(line.product.price.amount)) || Number(line.product.price.amount) <= 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore by ID from Shopify; localStorage is only a pointer, never cart data authority.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(saved);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setError("Your saved cart data was invalid and has been cleared. Please add your items again.");
          return;
        }
        const cartId = (parsed as { id?: unknown } | null)?.id;
        if (typeof cartId !== "string" || !cartId) {
          localStorage.removeItem(STORAGE_KEY);
          setError("Your saved cart data was incomplete and has been cleared. Please add your items again.");
          return;
        }
        const restored = await getCart(cartId);
        if (!active) return;
        if (!restored || restored.lines.nodes.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setCart(restored);
        if (hasInvalidOrZeroPrice(normalizeCart(restored))) {
          setError("Shopify returned a zero or invalid item price. Checkout is disabled until the item is corrected.");
        }
      } catch (cause) {
        if (!active) return;
        localStorage.removeItem(STORAGE_KEY);
        if (!isMissingCartError(cause)) {
          setError(cause instanceof Error ? cause.message : "Unable to restore your cart. Please add your items again.");
        }
      } finally {
        if (active) setHydrated(true);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  // Do not persist or clear anything until the initial localStorage restoration has finished.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: cart.id }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      setError("Your cart is active, but this browser could not save it for your next visit.");
    }
  }, [cart, hydrated]);

  const lines = useMemo(() => normalizeCart(cart), [cart]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const zeroOrInvalidPrice = hasInvalidOrZeroPrice(lines);

  const run = async (
    operation: () => Promise<ShopifyCart>,
    recoverMissingCart?: () => Promise<ShopifyCart>,
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const next = await operation();
      setCart(next);
      if (hasInvalidOrZeroPrice(normalizeCart(next))) {
        setError("Shopify returned a zero or invalid item price. Checkout is disabled until the item is corrected.");
      }
      return true;
    } catch (cause) {
      if (isMissingCartError(cause) && recoverMissingCart) {
        try {
          const recovered = await recoverMissingCart();
          setCart(recovered);
          return true;
        } catch (recoveryCause) {
          setCart(null);
          setError(recoveryCause instanceof Error ? recoveryCause.message : "Unable to restore your cart. Please try again.");
          return false;
        }
      }
      if (isMissingCartError(cause)) setCart(null);
      setError(cause instanceof Error ? cause.message : "Unable to update your bag.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (product: Product, variantId?: string, quantity = 1): Promise<boolean> => {
    if (!validQuantity(quantity)) {
      setError("Choose a whole-number quantity between 1 and 250.");
      setIsOpen(true);
      return false;
    }
    const selectedVariant = variantId
      ? product.variants.find((variant) => variant.id === variantId && variant.availableForSale)
      : getAvailableVariant(product);
    if (!selectedVariant) {
      setError("This product is not currently available.");
      setIsOpen(true);
      return false;
    }
    if (!Number.isFinite(Number(selectedVariant.price?.amount)) || !selectedVariant.price.currencyCode) {
      setError("Shopify did not return a valid price for this variant. It was not added to your cart.");
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
      return run(() => updateCart(cart.id, lines.map((line) => ({
        id: line.id,
        quantity: line.product.id === selectedVariantId ? line.quantity + quantity : line.quantity,
      }))), recoverMissingCart);
    }
    if (cart) {
      return run(() => addCartLines(cart.id, [{ merchandiseId: selectedVariantId, quantity }]), recoverMissingCart);
    }
    return run(() => createCart(selectedVariantId, quantity));
  };

  const addItems = async (products: Product[]): Promise<boolean> => {
    const merchandise = products.flatMap((product) => {
      const variant = getAvailableVariant(product);
      if (!variant || !Number.isFinite(Number(variant.price?.amount)) || !variant.price.currencyCode) return [];
      return [{ merchandiseId: variant.id, quantity: 1 }];
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
        nextCart = await createCart(merchandise);
      }
      setCart(nextCart);
      if (hasInvalidOrZeroPrice(normalizeCart(nextCart))) {
        setError("Shopify returned a zero or invalid item price. Checkout is disabled until the item is corrected.");
      }
      return true;
    } catch (cause) {
      if (isMissingCartError(cause) && cart) {
        try {
          const recovered = await createCart(mergeCartLines(cart, merchandise));
          setCart(recovered);
          return true;
        } catch (recoveryCause) {
          setCart(null);
          setError(recoveryCause instanceof Error ? recoveryCause.message : "Unable to restore your cart. Please try again.");
          return false;
        }
      }
      if (isMissingCartError(cause)) setCart(null);
      setError(cause instanceof Error ? cause.message : "Unable to add the shopping list to your cart.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    if (quantity <= 0) return removeItem(lineId);
    if (!validQuantity(quantity)) {
      setError("Choose a whole-number quantity between 1 and 250.");
      return;
    }
    await run(() => updateCart(cart.id, lines.map((line) => ({
      id: line.id,
      quantity: line.id === lineId ? quantity : line.quantity,
    }))));
  };
  const removeItem = async (lineId: string) => {
    if (cart) await run(() => removeCartLines(cart.id, [lineId]));
  };
  const checkout = () => {
    const checkoutUrl = cart?.checkoutUrl;
    if (!cart || lines.length === 0 || zeroOrInvalidPrice) {
      setError(zeroOrInvalidPrice
        ? "Checkout is disabled because Shopify returned a zero or invalid item price. Please contact the store for help."
        : "Your cart is empty. Add a product before checkout.");
      return;
    }
    try {
      const url = new URL(checkoutUrl ?? "");
      const storeHost = window.location.hostname;
      const isShopifyHost = url.hostname === storeHost || url.hostname.endsWith(".myshopify.com") || url.hostname === "checkout.shopify.com";
      if (url.protocol !== "https:" || !isShopifyHost) throw new Error("invalid Shopify checkout URL");
      window.location.assign(url.href);
    } catch {
      setError("Shopify did not return a valid secure checkout URL. Please refresh your cart and try again.");
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      lines,
      itemCount,
      subtotal: cart?.cost?.subtotalAmount ?? null,
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
    }}>
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
