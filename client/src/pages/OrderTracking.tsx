import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock, MapPin, Package, Search, ExternalLink, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, getOrderDetails, shopifyConfigured, type TrackedOrder } from "@/lib/store";

export default function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleSearch = async (e?: FormEvent, targetOrder?: string) => {
    if (e) e.preventDefault();
    const queryOrder = targetOrder || orderNumber;
    if (!queryOrder.trim()) {
      toast.error("Please enter your Order ID or Confirmation Number.");
      return;
    }

    setLoading(true);
    try {
      const result = await getOrderDetails(queryOrder, emailOrPhone);
      if (result) {
        setOrder(result);
        toast.success("Order details loaded", { description: `Order ${result.name}` });
      } else {
        toast.error("Order not found", { description: "Please check your Order ID and try again." });
      }
    } catch (err: any) {
      toast.error("Unable to lookup order", { description: err.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = () => {
    setOrderNumber("1001");
    setEmailOrPhone("customer@example.com");
    handleSearch(undefined, "1001");
  };

  return (
    <>
      <section className="page-intro section-pad">
        <span className="eyebrow">Nexus A Liverton Store / Customer Service</span>
        <h1>Order <em>Tracking.</em></h1>
        <p>Check the live status of your Smart Home and Beauty &amp; Wellness purchase in real time.</p>
      </section>

      <section className="section-pad track-order-section">
        <div className="track-order-card">
          <form onSubmit={handleSearch} className="track-form">
            <div className="track-form-grid">
              <div className="form-group">
                <label htmlFor="order-id">Order ID or Number *</label>
                <input
                  id="order-id"
                  type="text"
                  placeholder="e.g. #1001 or 1001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email-phone">Email Address or Phone (Optional)</label>
                <input
                  id="email-phone"
                  type="text"
                  placeholder="e.g. customer@example.com"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="track-form-actions">
              <button type="submit" className="button button-brass" disabled={loading}>
                {loading ? "Searching..." : <><Search size={16} /> Track Order</>}
              </button>
              <button type="button" className="button button-quiet" onClick={handleSampleClick}>
                Try Demo Order #1001
              </button>
            </div>
          </form>

          <div className="track-notice">
            <ShieldCheck size={16} />
            <span>
              <strong>Real-Time Tracking Active:</strong> Enter your order number above to view live fulfillment status.
            </span>
          </div>
        </div>

        {order && (
          <div className="order-result-card fade-in">
            <div className="order-header-row">
              <div>
                <span className="eyebrow">Order Summary</span>
                <h2>{order.name}</h2>
                <small className="order-date">Placed on {new Date(order.processedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</small>
              </div>
              <div className="order-badges">
                <span className={`status-badge financial-${order.financialStatus.toLowerCase()}`}>
                  {order.financialStatus}
                </span>
                <span className={`status-badge fulfillment-${order.fulfillmentStatus.toLowerCase()}`}>
                  {order.fulfillmentStatus.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Timeline Progress Tracker */}
            <div className="fulfillment-tracker">
              <div className="tracker-step is-complete">
                <div className="step-icon"><CheckCircle2 size={18} /></div>
                <span>Order Placed</span>
              </div>
              <div className="tracker-line is-complete" />
              <div className="tracker-step is-complete">
                <div className="step-icon"><Package size={18} /></div>
                <span>Processing</span>
              </div>
              <div className="tracker-line is-complete" />
              <div className={`tracker-step ${order.fulfillmentStatus === "IN_TRANSIT" || order.fulfillmentStatus === "FULFILLED" ? "is-complete" : "is-active"}`}>
                <div className="step-icon"><Truck size={18} /></div>
                <span>In Transit</span>
              </div>
              <div className="tracker-line" />
              <div className={`tracker-step ${order.fulfillmentStatus === "FULFILLED" ? "is-complete" : ""}`}>
                <div className="step-icon"><MapPin size={18} /></div>
                <span>Delivered</span>
              </div>
            </div>

            {/* Tracking Details */}
            {order.fulfillments.length > 0 && (
              <div className="fulfillment-details-box">
                <span className="eyebrow"><Truck size={14} /> Carrier Tracking Details</span>
                {order.fulfillments.map((f, idx) => (
                  <div key={idx} className="fulfillment-item">
                    <div>
                      <strong>Carrier: {f.company || "Express Courier"}</strong>
                      <p>Tracking Number: <code>{f.trackingNumber || "N/A"}</code></p>
                    </div>
                    {f.trackingUrl && (
                      <a href={f.trackingUrl} target="_blank" rel="noreferrer" className="button button-quiet button-sm">
                        Carrier Tracking <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Address & Items */}
            <div className="order-details-grid">
              <div className="order-address-box">
                <span className="eyebrow"><MapPin size={14} /> Shipping Address</span>
                {order.shippingAddress ? (
                  <address>
                    <strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong><br />
                    {order.shippingAddress.address1}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.country}
                  </address>
                ) : (
                  <p>Standard Global Courier Shipping</p>
                )}
              </div>

              <div className="order-items-box">
                <span className="eyebrow"><Package size={14} /> Items in Package</span>
                <ul className="order-item-list">
                  {order.lineItems.map((item, idx) => (
                    <li key={idx} className="order-item">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="order-item-img" />
                      ) : (
                        <div className="order-item-img-placeholder">N</div>
                      )}
                      <div className="order-item-info">
                        <strong>{item.title}</strong>
                        {item.variantTitle && <small>{item.variantTitle}</small>}
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <span className="order-item-price">{formatPrice(item.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="order-total-row">
                  <span>Total Paid:</span>
                  <strong>{formatPrice(order.totalPrice)}</strong>
                </div>
              </div>
            </div>

            {/* External Shopify Link */}
            {order.statusUrl && (
              <div className="shopify-status-action">
                <a href={order.statusUrl} target="_blank" rel="noreferrer" className="button button-dark">
                  View Official Shopify Status Page <ExternalLink size={15} />
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
