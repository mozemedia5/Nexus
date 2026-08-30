/* LongTail Parisian Atelier Editorial — the cart behaves like a boutique drawer: direct, calm, reversible. */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getProduct, type Product } from "@/lib/store";

type CartLine = { product: Product; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, number>>({});
  const [isOpen, setIsOpen] = useState(false);

  const lines = useMemo(
    () =>
      Object.entries(items)
        .map(([productId, quantity]) => ({ product: getProduct(productId), quantity }))
        .filter((line): line is CartLine => Boolean(line.product && line.quantity > 0)),
    [items],
  );

  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);

  const addItem = (productId: string) => {
    setItems((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
    setIsOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  };

  const removeItem = (productId: string) => updateQuantity(productId, 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        itemCount,
        subtotal,
        isOpen,
        addItem,
        updateQuantity,
        removeItem,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        toggleCart: () => setIsOpen((current) => !current),
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
