import { useState, useEffect } from "react";
import { Minus, Plus, X, Tag, Lock, ArrowUpRight, Globe } from "lucide-react";
import { formatPrice } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
];

// Approximate rates from USD (Shopify uses its own rates at checkout)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53,
  ZAR: 18.15, KES: 153.5, NGN: 1540, GHS: 14.8, INR: 83.1,
};

function convertPrice(amount: number, currencyCode: string): string {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  const converted = amount * rate;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: currencyCode === "USD" || currencyCode === "EUR" || currencyCode === "GBP" ? 2 : 0,
  }).format(converted);
}

export default function CartDrawer() {
  const { lines, subtotal, isOpen, closeCart, updateQuantity, removeItem, checkout, busy, error, cart } = useCart();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem("nexus_currency") || "USD";
  });

  useEffect(() => {
    localStorage.setItem("nexus_currency", selectedCurrency);
  }, [selectedCurrency]);

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const isMultiItemDiscount = totalQuantity >= 2;
  const rawSubtotalNum = subtotal ? Number(subtotal.amount) : 0;
  const discountedNum = isMultiItemDiscount ? rawSubtotalNum * 0.5 : rawSubtotalNum;

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

        {/* Currency Selector */}
        <div className="px-6 py-2.5 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs">
            <Globe size={13} className="text-slate-400" />
            <span className="text-slate-500 font-medium">Currency:</span>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.label}</option>
              ))}
            </select>
          </div>
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
                        {selectedCurrency === "USD"
                          ? formatPrice({ amount: (Number(line.product.price.amount) * line.quantity).toString(), currencyCode: "USD" })
                          : convertPrice(Number(line.product.price.amount) * line.quantity, selectedCurrency)
                        }
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
                  <strong className="block text-amber-700 font-bold text-[10px]">Buy 2+ discount applied!</strong>
                  <span className="text-slate-600 dark:text-slate-300">15% multi-item discount unlocked automatically.</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 font-semibold mb-2 flex items-center gap-1">
                <Tag size={12} /> Add 1 more product to get 15% OFF your total!
              </p>
            )}

            <div className="summary-row">
              <span>Subtotal</span>
              <div className="flex items-baseline gap-2">
                {isMultiItemDiscount && (
                  <del className="text-xs text-slate-400 font-normal">
                    {selectedCurrency === "USD"
                      ? formatPrice(subtotal)
                      : convertPrice(rawSubtotalNum, selectedCurrency)
                    }
                  </del>
                )}
                <strong>
                  {selectedCurrency === "USD"
                    ? formatPrice({ amount: discountedNum.toFixed(2), currencyCode: "USD" })
                    : convertPrice(discountedNum, selectedCurrency)
                  }
                </strong>
              </div>
            </div>
            <p className="text-xs text-slate-500 my-2">Secure checkout powered by Shopify.</p>
            <button
              type="button"
              className="button button-brass button-wide py-3 font-medium text-sm flex items-center justify-center gap-2"
              onClick={() => {
                const url = cart?.checkoutUrl;
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={busy}
            >
              <Lock size={14} /> {busy ? "Updating…" : "Secure Checkout"} <ArrowUpRight size={12} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
