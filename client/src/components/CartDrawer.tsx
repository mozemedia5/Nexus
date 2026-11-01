import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Minus, Plus, X, Lock, ArrowUpRight, ShoppingCart, Truck, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

const DESTINATION_COUNTRIES = [
  ["US", "United States"], ["KE", "Kenya"], ["GB", "United Kingdom"], ["CA", "Canada"],
  ["AU", "Australia"], ["NG", "Nigeria"], ["ZA", "South Africa"], ["IN", "India"],
  ["AE", "United Arab Emirates"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"],
] as const;

export default function CartDrawer() {
  const {
    lines, itemCount, subtotal, shippingRates, shippingBusy, shippingError, estimateShipping,
    selectShippingRate, isOpen, closeCart, updateQuantity, removeItem, checkout, busy, error, cart,
  } = useCart();
  const [countryCode, setCountryCode] = useState("");
  const [otherCountryCode, setOtherCountryCode] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedRateId, setSelectedRateId] = useState("");
  const selectedRate = useMemo(
    () => shippingRates.find((rate) => rate.id === selectedRateId) ?? shippingRates[0] ?? null,
    [shippingRates, selectedRateId],
  );
  const estimatedTotal = useMemo(() => {
    if (!subtotal || !selectedRate || selectedRate.currencyCode !== subtotal.currencyCode) return null;
    return {
      amount: (Number(subtotal.amount) + Number(selectedRate.amount)).toFixed(2),
      currencyCode: subtotal.currencyCode,
    };
  }, [subtotal, selectedRate]);

  const fetchRates = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const destinationCode = countryCode === "OTHER" ? otherCountryCode.trim() : countryCode;
    if (!destinationCode) return;
    setSelectedRateId("");
    await estimateShipping({ countryCode: destinationCode, postalCode });
  };

  const changeRate = async (rateId: string) => {
    if (await selectShippingRate(rateId)) setSelectedRateId(rateId);
  };

  return (
    <>
      <div className={`cart-scrim ${isOpen ? "is-open" : ""}`} onClick={closeCart} aria-hidden="true" />
      <aside className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-label="Cart" aria-hidden={!isOpen}>
        <div className="cart-drawer-head">
          <div>
            <span className="eyebrow">Nexus · your selection</span>
            <h2 className="cart-title"><ShoppingCart size={20} /> Your Cart</h2>
            {itemCount > 0 && <p className="cart-item-count">{itemCount} {itemCount === 1 ? "item" : "items"} reserved in this browser</p>}
          </div>
          <button type="button" className="icon-button" onClick={closeCart} aria-label="Close Cart">
            <X size={21} />
          </button>
        </div>

        <div className="cart-body">
          {lines.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-mark">N</span>
              <h3>Your Cart is empty</h3>
              <p>Your selections are saved privately in this browser. Explore curated Smart Home and Workspace finds.</p>
              <button type="button" className="button button-dark" onClick={closeCart}>
                Continue browsing ↗
              </button>
            </div>
          ) : (
            <div className="cart-lines">
              {lines.map((line) => {
                const unitAmount = Number(line.product.price.amount);
                const lineTotal = Number.isFinite(unitAmount) ? {
                  amount: (unitAmount * line.quantity).toFixed(2),
                  currencyCode: line.product.price.currencyCode || subtotal?.currencyCode || "USD",
                } : null;
                return (
                  <article className="cart-line" key={line.id}>
                    <Link href={`/products/${line.product.handle}`} className="cart-product-image" onClick={closeCart} aria-label={`View ${line.product.name}`}>
                      <img src={line.product.image?.url ?? "/logo.png"} alt={line.product.image?.altText ?? line.product.name} />
                      <span>View</span>
                    </Link>
                    <div className="cart-line-content">
                      <div className="cart-line-title">
                        <div>
                          <Link href={`/products/${line.product.handle}`} onClick={closeCart} className="cart-product-name">{line.product.name}</Link>
                          {line.product.variantTitle && line.product.variantTitle !== "Default Title" && (
                            <span className="cart-variant">{line.product.variantTitle}</span>
                          )}
                        </div>
                        <button type="button" className="remove-button" onClick={() => removeItem(line.id)} disabled={busy}>
                          Remove
                        </button>
                      </div>
                      <div className="cart-line-foot">
                        <div className="quantity-control" aria-label={`Quantity for ${line.product.name}`}>
                          <button type="button" onClick={() => updateQuantity(line.id, line.quantity - 1)} disabled={busy} aria-label="Decrease quantity">
                            <Minus size={12} />
                          </button>
                          <span>{line.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(line.id, line.quantity + 1)} disabled={busy} aria-label="Increase quantity">
                            <Plus size={12} />
                          </button>
                        </div>
                        <strong>{lineTotal ? formatPrice(lineTotal) : "Price updating"}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {error && <p className="cart-error" role="alert">{error}</p>}
        </div>

        {lines.length > 0 && (
          <div className="cart-summary">
            <div className="cart-shipping-estimator">
              <div className="shipping-estimator-heading"><Truck size={15} /><strong>Estimate delivery</strong></div>
              <p>Enter your destination to fetch available shipping rates.</p>
              <form className="shipping-estimator-form" onSubmit={fetchRates}>
                <label>
                  <span>Country</span>
                  <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} required>
                    <option value="">Select country</option>
                    {DESTINATION_COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    <option value="OTHER">Other country</option>
                  </select>
                </label>
                {countryCode === "OTHER" && (
                  <label>
                    <span>2-letter country code</span>
                    <input value={otherCountryCode} onChange={(event) => setOtherCountryCode(event.target.value.toUpperCase().slice(0, 2))} autoComplete="country" placeholder="e.g. JP" required />
                  </label>
                )}
                <label>
                  <span>Postal / ZIP code</span>
                  <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} autoComplete="postal-code" placeholder="Enter postal code" required />
                </label>
                  <button type="submit" className="shipping-estimator-submit" disabled={shippingBusy || busy || !cart?.id || !countryCode || (countryCode === "OTHER" && otherCountryCode.length !== 2) || !postalCode.trim()}>
                  {shippingBusy ? "Fetching rates…" : shippingRates.length ? "Refresh rates" : "Get rates"}
                </button>
              </form>
              {shippingError && <p className="shipping-estimator-error" role="status">{shippingError}</p>}
              {shippingRates.length > 0 && (
                <label className="shipping-rate-select">
                  <span>Available shipping</span>
                  <select value={selectedRate?.id ?? ""} onChange={(event) => void changeRate(event.target.value)} disabled={shippingBusy}>
                    {shippingRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.title} · {formatPrice({ amount: rate.amount, currencyCode: rate.currencyCode })}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{subtotal ? formatPrice(subtotal) : "Updating prices…"}</strong>
            </div>
            {selectedRate && (
              <div className="summary-row shipping-summary-row">
                <span>Shipping estimate</span>
                <strong>{formatPrice({ amount: selectedRate.amount, currencyCode: selectedRate.currencyCode })}</strong>
              </div>
            )}
            {estimatedTotal && (
              <div className="summary-row estimated-total-row">
                <span>Estimated total</span>
                <strong>{formatPrice(estimatedTotal)}</strong>
              </div>
            )}
            <p className="cart-summary-note">Taxes and final delivery options are confirmed by Shopify at checkout.</p>
            <button
              type="button"
              className="button button-brass button-wide cart-checkout-button"
              onClick={checkout}
              disabled={busy || !cart?.checkoutUrl || !itemCount}
            >
              <Lock size={15} /> {busy ? "Updating cart…" : "Continue to secure checkout"} <ArrowUpRight size={14} />
            </button>
            <div className="cart-trust-note"><ShieldCheck size={14} /> Secure checkout · your cart stays in this browser</div>
          </div>
        )}
      </aside>
    </>
  );
}
