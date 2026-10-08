import { Minus, Plus, X, Lock, ArrowUpRight } from "lucide-react";
import { formatPrice } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function CartDrawer() {
  const { lines, subtotal, isOpen, closeCart, updateQuantity, removeItem, checkout, busy, error, cart } = useCart();

  return (
    <>
      <div className={`cart-scrim ${isOpen ? "is-open" : ""}`} onClick={closeCart} aria-hidden="true" />
      <aside className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!isOpen}>
        <div className="cart-drawer-head">
          <div>
            <span className="eyebrow">Nexus</span>
            <h2>Your Bag</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeCart} aria-label="Close bag">
            <X size={21} />
          </button>
        </div>

        <div className="cart-body">
          {lines.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-mark">N</span>
              <h3>Your bag is empty</h3>
              <p>Explore Smart Home and Workspace finds from Nexus.</p>
              <button type="button" className="button button-dark" onClick={closeCart}>
                Continue browsing ↗
              </button>
            </div>
          ) : (
            <div className="cart-lines">
              {lines.map((line) => (
                <div className="cart-line flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" key={line.id}>
                  <img src={line.product.image?.url ?? "/logo.png"} alt={line.product.image?.altText ?? line.product.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">{line.product.name}</h3>
                        {line.product.variantTitle && line.product.variantTitle !== "Default Title" && (
                          <span className="text-[11px] text-slate-400 block">{line.product.variantTitle}</span>
                        )}
                      </div>
                      <button type="button" className="text-[11px] text-rose-500 hover:text-rose-600 font-medium shrink-0" onClick={() => removeItem(line.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-800">
                        <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => updateQuantity(line.id, line.quantity - 1)} aria-label="Decrease quantity">
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-bold">{line.quantity}</span>
                        <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => updateQuantity(line.id, line.quantity + 1)} aria-label="Increase quantity">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatPrice({ amount: (Number(line.product.price.amount) * line.quantity).toString(), currencyCode: line.product.price.currencyCode || "USD" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="cart-error">{error}</p>}
        </div>
        {lines.length > 0 && (
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="text-xs text-slate-500 my-2">Taxes and shipping calculated at checkout via Shopify.</p>
            <button
              type="button"
              className="button button-brass button-wide py-3 font-medium text-sm flex items-center justify-center gap-2"
              onClick={checkout}
              disabled={busy}
            >
              <Lock size={14} /> {busy ? "Updating…" : "Checkout"} <ArrowUpRight size={12} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
