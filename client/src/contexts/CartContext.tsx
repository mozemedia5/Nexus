import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addCartLines,
  createCart,
  getAvailableVariant,
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

const CartContext = createContext<CartContextValue | null>(null);

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("liverton-shopify-cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem("liverton-shopify-cart");
      }
    }
  }, []);

  useEffect(() => {
    if (cart) localStorage.setItem("liverton-shopify-cart", JSON.stringify(cart));
    else localStorage.removeItem("liverton-shopify-cart");
  }, [cart]);

  const lines = useMemo(() => normalizeCart(cart), [cart]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const run = async (operation: () => Promise<ShopifyCart>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      setCart(await operation());
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your bag.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (product: Product, variantId?: string, quantity = 1): Promise<boolean> => {
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
    if (cart && lines.some((line) => line.product.id === selectedVariantId)) {
      return run(() => updateCart(cart.id, lines.map((line) => ({
        id: line.id,
        quantity: line.product.id === selectedVariantId ? line.quantity + quantity : line.quantity,
      }))));
    }
    if (cart) {
      return run(() => addCartLines(cart.id, [{ merchandiseId: selectedVariantId, quantity }]));
    }
    return run(() => createCart(selectedVariantId, quantity));
  };

  const addItems = async (products: Product[]): Promise<boolean> => {
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
      setCart(nextCart);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add the shopping list to your cart.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    if (quantity <= 0) return removeItem(lineId);
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
