import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addCartLines,
  addQuantities,
  cartQuantities,
  createCart,
  getAvailableVariant,
  getCart,
  getPurchasableCartLines,
  isPurchasableVariant,
  isValidMoney,
  isValidShopifyVariantId,
  removeCartLines,
  shopifyStoreDomain,
  updateCart,
  type Money,
  type Product,
  type ShopifyCartResponse,
} from "@/lib/store";

type CartLine = {
  id: string;
  quantity: number;
  product: {
    id: string;
    handle: string;
    name: string;
    image: { url: string; altText: string | null } | null;
    price: Money;
    total: Money;
    variantTitle: string;
  };
};
type CartSnapshot = {
  id?: string;
  lines: { merchandiseId: string; quantity: number }[];
};
type CartContextValue = {
  cart: ShopifyCartResponse | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money | null;
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  addItem: (
    product: Product,
    variantId?: string,
    quantity?: number
  ) => Promise<boolean>;
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
  return /cart.{0,80}(does not exist|not found|invalid|expired)|expired cart|CART_NOT_FOUND/i.test(
    message
  );
}

export function parseCartSnapshot(saved: string): CartSnapshot {
  const value: unknown = JSON.parse(saved);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(
      "Your saved cart data was incomplete and has been cleared."
    );
  const record = value as { id?: unknown; lines?: unknown };
  if (record.id !== undefined && (typeof record.id !== "string" || !record.id))
    throw new Error("Your saved cart ID was invalid and has been cleared.");
  if (record.lines !== undefined && !Array.isArray(record.lines))
    throw new Error(
      "Your saved cart items were invalid and have been cleared."
    );
  const rawLines = Array.isArray(record.lines) ? record.lines : [];
  if (rawLines.length > 100)
    throw new Error(
      "Your saved cart contained too many items and has been cleared."
    );
  const totals = new Map<string, number>();
  for (const raw of rawLines) {
    if (!raw || typeof raw !== "object") continue;
    const line = raw as { merchandiseId?: unknown; quantity?: unknown };
    if (
      !isValidShopifyVariantId(line.merchandiseId) ||
      !Number.isInteger(line.quantity) ||
      Number(line.quantity) < 1 ||
      Number(line.quantity) > 250
    )
      continue;
    const next = (totals.get(line.merchandiseId) ?? 0) + Number(line.quantity);
    if (next <= 250) totals.set(line.merchandiseId, next);
  }
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    lines: Array.from(totals.entries()).map(([merchandiseId, quantity]) => ({
      merchandiseId,
      quantity,
    })),
  };
}

function normalizeCart(cart: ShopifyCartResponse | null): CartLine[] {
  return (cart?.lines?.nodes ?? []).map(line => ({
    id: line.id,
    quantity: line.quantity,
    product: {
      id: line.merchandise.id,
      handle: line.merchandise.product.handle,
      name: line.merchandise.product.title,
      image: line.merchandise.product.featuredImage,
      price: line.cost?.amountPerQuantity ?? line.merchandise.price,
      total: line.cost?.totalAmount ?? line.merchandise.price,
      variantTitle: line.merchandise.title,
    },
  }));
}

function validQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 250;
}

function cartLinesWithChange(
  cart: ShopifyCartResponse,
  options: {
    removeLineIds?: string[];
    update?: { lineId: string; quantity: number };
  }
) {
  const removed = new Set(options.removeLineIds ?? []);
  const quantities = new Map<string, number>();
  for (const line of cart.lines.nodes) {
    if (removed.has(line.id)) continue;
    const quantity =
      options.update?.lineId === line.id
        ? options.update.quantity
        : line.quantity;
    quantities.set(
      line.merchandise.id,
      (quantities.get(line.merchandise.id) ?? 0) + quantity
    );
  }
  return Array.from(quantities.entries()).map(([merchandiseId, quantity]) => ({
    merchandiseId,
    quantity,
  }));
}

function cartErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export function mergeAvailableCartLines(
  availableSavedLines: { merchandiseId: string; quantity: number }[],
  additions: { merchandiseId: string; quantity: number }[]
) {
  const savedQuantities = new Map(
    availableSavedLines.map(line => [line.merchandiseId, line.quantity])
  );
  const merged = addQuantities(savedQuantities, additions);
  return Array.from(merged.entries()).map(([merchandiseId, quantity]) => ({
    merchandiseId,
    quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCartResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const operationLock = useRef(false);
  const preserveSnapshotRef = useRef(false);

  // The stored cart ID is authoritative only after Shopify confirms it. The line snapshot
  // contains variant IDs and quantities solely to rebuild a cart after Shopify expires it.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      let hadSavedSnapshot = false;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        hadSavedSnapshot = true;
        let snapshot: CartSnapshot;
        try {
          snapshot = parseCartSnapshot(saved);
        } catch (cause) {
          localStorage.removeItem(STORAGE_KEY);
          setError(
            cartErrorMessage(
              cause,
              "Your saved cart data was invalid and has been cleared."
            )
          );
          return;
        }
        let shouldRecover = !snapshot.id;
        if (snapshot.id) {
          try {
            const restored = await getCart(snapshot.id);
            if (restored) {
              if (!active) return;
              if (restored.lines.nodes.length) setCart(restored);
              else {
                localStorage.removeItem(STORAGE_KEY);
                preserveSnapshotRef.current = false;
                setCart(null);
              }
              return;
            }
            shouldRecover = true;
          } catch (cause) {
            if (!isMissingCartError(cause)) throw cause;
            shouldRecover = true;
          }
        }
        if (!active) return;
        if (shouldRecover && snapshot.lines.length) {
          const validLines = await getPurchasableCartLines(snapshot.lines);
          if (!active) return;
          if (!validLines.length)
            throw new Error(
              "Your previous cart expired and none of its products are currently available."
            );
          const recovered = await createCart(validLines);
          if (!active) return;
          preserveSnapshotRef.current = false;
          setCart(recovered);
          setError(
            validLines.length !== snapshot.lines.length
              ? "Your previous cart expired. Available items were restored; unavailable items were removed."
              : "Your previous cart expired and its available items were restored."
          );
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
        preserveSnapshotRef.current = false;
      } catch (cause) {
        if (!active) return;
        // A transient Shopify/network error does not prove this snapshot is invalid.
        preserveSnapshotRef.current = hadSavedSnapshot;
        setError(
          cartErrorMessage(
            cause,
            "Unable to restore your cart. Please add your items again."
          )
        );
      } finally {
        if (active) setHydrated(true);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart) {
        const lines = Array.from(cartQuantities(cart).entries()).map(
          ([merchandiseId, quantity]) => ({ merchandiseId, quantity })
        );
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id: cart.id, lines })
        );
      } else {
        if (preserveSnapshotRef.current) return;
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      setError(
        "Your cart is active, but this browser could not save it for your next visit."
      );
    }
  }, [cart, hydrated]);

  const lines = useMemo(() => normalizeCart(cart), [cart]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const zeroOrInvalidPrice = lines.some(
    line => !isValidMoney(line.product.price)
  );

  const run = async (
    operation: () => Promise<ShopifyCartResponse>,
    recoverMissingCart?: () => Promise<ShopifyCartResponse | null>
  ): Promise<boolean> => {
    if (!hydrated) {
      setIsOpen(true);
      setError(
        "Your saved cart is still being restored. Please try again in a moment."
      );
      return false;
    }
    if (operationLock.current) {
      setIsOpen(true);
      setError("Your cart is updating. Please wait for it to finish.");
      return false;
    }
    operationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const next = await operation();
      preserveSnapshotRef.current = false;
      setCart(next);
      return true;
    } catch (cause) {
      if (isMissingCartError(cause) && recoverMissingCart) {
        try {
          const recovered = await recoverMissingCart();
          preserveSnapshotRef.current = false;
          setCart(recovered);
          setError(
            "Your previous cart expired. Available items were restored with current Shopify prices."
          );
          return true;
        } catch (recoveryCause) {
          preserveSnapshotRef.current = true;
          setCart(null);
          setError(
            cartErrorMessage(
              recoveryCause,
              "Your previous cart expired and could not be restored. Please select your items again."
            )
          );
          return false;
        }
      }
      if (isMissingCartError(cause)) {
        preserveSnapshotRef.current = true;
        setCart(null);
      }
      setError(cartErrorMessage(cause, "Unable to update your bag."));
      return false;
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };

  const createCartWithSavedItems = async (
    additions: { merchandiseId: string; quantity: number }[]
  ) => {
    if (!preserveSnapshotRef.current) return createCart(additions);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      preserveSnapshotRef.current = false;
      return createCart(additions);
    }
    let snapshot: CartSnapshot;
    try {
      snapshot = parseCartSnapshot(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      preserveSnapshotRef.current = false;
      return createCart(additions);
    }
    const availableLines = await getPurchasableCartLines(snapshot.lines);
    return createCart(mergeAvailableCartLines(availableLines, additions));
  };

  const addItem = async (
    product: Product,
    variantId?: string,
    quantity = 1
  ): Promise<boolean> => {
    setIsOpen(true);
    if (!validQuantity(quantity)) {
      setError("Choose a whole-number quantity between 1 and 250.");
      return false;
    }
    const selectedVariant = getAvailableVariant(product, variantId);
    if (!selectedVariant || !isPurchasableVariant(selectedVariant)) {
      setError(
        variantId
          ? "The selected option is not currently purchasable. Choose another available variant."
          : "This product has no valid, available Shopify variant."
      );
      return false;
    }
    const additions = [{ merchandiseId: selectedVariant.id, quantity }];
    if (cart) {
      const recover = () =>
        createCart(
          Array.from(cartQuantities(cart).entries())
            .map(([merchandiseId, oldQuantity]) => ({
              merchandiseId,
              quantity: oldQuantity,
            }))
            .concat(additions)
        );
      return run(() => addCartLines(cart.id, additions, cart), recover);
    }
    return run(() => createCartWithSavedItems(additions));
  };

  const addItems = async (products: Product[]): Promise<boolean> => {
    setIsOpen(true);
    if (!products.length) {
      setError("Choose at least one available product to add to your cart.");
      return false;
    }
    const additions = new Map<string, number>();
    for (const product of products) {
      const variant = getAvailableVariant(product);
      if (!variant || !isPurchasableVariant(variant)) {
        setError(
          `${product.name} has no valid, available Shopify variant and was not added.`
        );
        return false;
      }
      const next = (additions.get(variant.id) ?? 0) + 1;
      if (next > 250) {
        setError("Shopify carts are limited to 250 of each product.");
        return false;
      }
      additions.set(variant.id, next);
    }
    const linesToAdd = Array.from(additions.entries()).map(
      ([merchandiseId, quantity]) => ({ merchandiseId, quantity })
    );
    if (cart) {
      const recover = () =>
        createCart(
          Array.from(cartQuantities(cart).entries())
            .map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }))
            .concat(linesToAdd)
        );
      return run(() => addCartLines(cart.id, linesToAdd, cart), recover);
    }
    return run(() => createCartWithSavedItems(linesToAdd));
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    if (!cart.lines.nodes.some(line => line.id === lineId)) {
      setError("The item is no longer in your cart. Refresh and try again.");
      return;
    }
    if (quantity <= 0) return removeItem(lineId);
    if (!validQuantity(quantity)) {
      setError("Choose a whole-number quantity between 1 and 250.");
      return;
    }
    const updates = lines.map(line => ({
      id: line.id,
      quantity: line.id === lineId ? quantity : line.quantity,
    }));
    const recover = () =>
      createCart(cartLinesWithChange(cart, { update: { lineId, quantity } }));
    await run(() => updateCart(cart.id, updates, cart), recover);
  };

  const removeItem = async (lineId: string) => {
    if (!cart) return;
    const recover = async () => {
      const remaining = cartLinesWithChange(cart, { removeLineIds: [lineId] });
      return remaining.length ? createCart(remaining) : null;
    };
    await run(() => removeCartLines(cart.id, [lineId], cart), recover);
  };

  const checkout = () => {
    const checkoutUrl = cart?.checkoutUrl;
    if (!cart || lines.length === 0 || zeroOrInvalidPrice) {
      setError(
        zeroOrInvalidPrice
          ? "Checkout is disabled because Shopify returned an invalid item price or quantity. Please contact the store for help."
          : "Your cart is empty. Add a product before checkout."
      );
      return;
    }
    try {
      const url = new URL(checkoutUrl ?? "");
      const isShopifyHost =
        url.hostname === shopifyStoreDomain ||
        url.hostname === "checkout.shopify.com";
      if (url.protocol !== "https:" || !isShopifyHost)
        throw new Error("invalid Shopify checkout URL");
      window.location.assign(url.href);
    } catch {
      setError(
        "Shopify did not return a valid secure checkout URL. Please refresh your cart and try again."
      );
    }
  };

  return (
    <CartContext.Provider
      value={{
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
        toggleCart: () => setIsOpen(value => !value),
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
