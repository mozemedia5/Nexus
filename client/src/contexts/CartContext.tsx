import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addCartLines, createCart, removeCartLines, updateCart, type Product } from "@/lib/store";

type CartLine = { id: string; quantity: number; product: { id: string; handle: string; name: string; image: { url: string; altText: string | null } | null; price: { amount: string; currencyCode: string }; variantTitle: string } };
type ShopifyCart = { id: string; checkoutUrl: string; lines: { nodes: any[] }; cost: { subtotalAmount: { amount: string; currencyCode: string } } };
type CartContextValue = { cart: ShopifyCart | null; lines: CartLine[]; itemCount: number; subtotal: { amount: string; currencyCode: string } | null; isOpen: boolean; busy: boolean; error: string | null; addItem: (product: Product, variantId?: string, quantity?: number) => Promise<void>; updateQuantity: (lineId: string, quantity: number) => Promise<void>; removeItem: (lineId: string) => Promise<void>; checkout: () => void; openCart: () => void; closeCart: () => void; toggleCart: () => void };
const CartContext = createContext<CartContextValue | null>(null);
function normalizeCart(cart: ShopifyCart | null): CartLine[] { return (cart?.lines?.nodes ?? []).map((line: any) => ({ id: line.id, quantity: line.quantity, product: { id: line.merchandise.id, handle: line.merchandise.product.handle, name: line.merchandise.product.title, image: line.merchandise.product.featuredImage, price: line.merchandise.price, variantTitle: line.merchandise.title } })); }
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null); const [isOpen, setIsOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const saved = localStorage.getItem("liverton-shopify-cart"); if (saved) { try { setCart(JSON.parse(saved)); } catch { localStorage.removeItem("liverton-shopify-cart"); } } }, []);
  useEffect(() => { if (cart) localStorage.setItem("liverton-shopify-cart", JSON.stringify(cart)); else localStorage.removeItem("liverton-shopify-cart"); }, [cart]);
  const lines = useMemo(() => normalizeCart(cart), [cart]); const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const run = async (operation: () => Promise<ShopifyCart>) => { setBusy(true); setError(null); try { setCart(await operation()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update your bag."); } finally { setBusy(false); } };
  const addItem = async (product: Product, variantId = product.variants[0]?.id, quantity = 1) => { if (!variantId) { setError("This product has no available variant."); return; } setIsOpen(true); if (cart && lines.some((line) => line.product.id === variantId)) { await run(() => updateCart(cart.id, lines.map((line) => ({ id: line.id, quantity: line.product.id === variantId ? line.quantity + quantity : line.quantity })))); } else if (cart) { await run(() => addCartLines(cart.id, [{ merchandiseId: variantId, quantity }])); } else { await run(() => createCart(variantId, quantity)); } };
  const updateQuantity = async (lineId: string, quantity: number) => { if (!cart) return; if (quantity <= 0) return removeItem(lineId); await run(() => updateCart(cart.id, lines.map((line) => ({ id: line.id, quantity: line.id === lineId ? quantity : line.quantity })))); };
  const removeItem = async (lineId: string) => { if (cart) await run(() => removeCartLines(cart.id, [lineId])); };
  const checkout = () => { if (cart?.checkoutUrl) window.location.assign(cart.checkoutUrl); };
  return <CartContext.Provider value={{ cart, lines, itemCount, subtotal: cart?.cost?.subtotalAmount ?? null, isOpen, busy, error, addItem, updateQuantity, removeItem, checkout, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), toggleCart: () => setIsOpen((value) => !value) }}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used inside CartProvider"); return value; }
