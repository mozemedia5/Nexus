import { useState, useEffect } from "react";
import { Minus, Plus, X, Tag, Lock, ArrowUpRight } from "lucide-react";
import { formatPrice } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function CartDrawer() {
  const { lines, subtotal, isOpen, closeCart, updateQuantity, removeItem, checkout, busy, error } = useCart();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleCheckoutEvent = (e: any) => {
      if (e.detail?.checkoutUrl) {
        setCheckoutUrl(e.detail.checkoutUrl);
      }
    };
    window.addEventListener("open-nexus-checkout", handleCheckoutEvent);
    return () => window.removeEventListener("open-nexus-checkout", handleCheckoutEvent);
  }, []);

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const isMultiItemDiscount = totalQuantity >= 2;
  const rawSubtotalNum = subtotal ? Number(subtotal.amount) : 0;
  const discountedNum = isMultiItemDiscount ? rawSubtotalNum * 0.5 : rawSubtotalNum;
  const currency = subtotal?.currencyCode || "USD";

  return (
    <>
      <div className={`cart-scrim ${isOpen ? "is-open" : ""}`} onClick={closeCart} aria-hidden="true" />
      <aside className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!isOpen}>
        <div className="cart-drawer-head">
          <div>
            <span className="eyebrow">Nexus A Liverton Store</span>
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
              <p>Explore Smart Home and Beauty &amp; Wellness finds from Nexus.</p>
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
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white normal-case line-clamp-1">{line.product.name}</h3>
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
                        {formatPrice({ amount: (Number(line.product.price.amount) * line.quantity).toString(), currencyCode: line.product.price.currencyCode })}
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
            {isMultiItemDiscount ? (
              <div className="p-3 mb-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs flex items-center gap-2">
                <Tag size={16} className="text-amber-600 shrink-0" />
                <div>
                  <strong className="block text-amber-700 font-bold uppercase tracking-wider text-[10px]">Administrator 50% Offer Applied!</strong>
                  <span className="text-slate-600 dark:text-slate-300">Buy 2+ items discount unlocked automatically.</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 font-semibold mb-2 flex items-center gap-1">
                <Tag size={12} /> Add 1 more product to get 50% OFF your total order!
              </p>
            )}

            <div className="summary-row">
              <span>Subtotal</span>
              <div className="flex items-baseline gap-2">
                {isMultiItemDiscount && (
                  <del className="text-xs text-slate-400 font-normal">{formatPrice(subtotal)}</del>
                )}
                <strong>{formatPrice({ amount: discountedNum.toFixed(2), currencyCode: currency })}</strong>
              </div>
            </div>
            <p className="text-xs text-slate-500 my-2">Calculated in real-time. Direct secure checkout within Nexus website.</p>
            <button type="button" className="button button-brass button-wide py-3 font-medium text-sm flex items-center justify-center gap-2" onClick={checkout} disabled={busy}>
              <Lock size={14} /> {busy ? "Updating…" : "Secure Checkout"}
            </button>
          </div>
        )}
      </aside>

      {/* Embedded In-Site Checkout Modal */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-amber-400" />
                <span className="text-sm font-bold tracking-wider uppercase">Nexus Secure Checkout</span>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutUrl(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Close checkout"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative bg-slate-50">
              <iframe
                src={checkoutUrl}
                title="Nexus Checkout"
                className="w-full h-full border-0"
                allow="payment"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
