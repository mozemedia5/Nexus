/* LongTail Parisian Atelier Editorial — cart drawer motion stays tactile, compact, and reversible. */

import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function CartDrawer() {
  const { lines, subtotal, isOpen, closeCart, updateQuantity, removeItem } = useCart();

  const handleCheckout = () => {
    toast("Checkout is being prepared", { description: "Connect your commerce backend to accept live orders." });
  };

  return (
    <>
      <div className={`cart-scrim ${isOpen ? "is-open" : ""}`} onClick={closeCart} aria-hidden="true" />
      <aside className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-label="Shopping cart" aria-hidden={!isOpen}>
        <div className="cart-drawer-head">
          <div>
            <span className="eyebrow">Your selection</span>
            <h2>Shopping Bag</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeCart} aria-label="Close shopping bag"><X size={21} /></button>
        </div>

        <div className="cart-body">
          {lines.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-mark" aria-hidden="true">LT</span>
              <h3>Your bag is empty</h3>
              <p>Begin with a considered piece for the long way home.</p>
              <button type="button" className="button button-dark" onClick={closeCart}>Continue browsing <span aria-hidden="true">↗</span></button>
            </div>
          ) : (
            <div className="cart-lines">
              {lines.map(({ product, quantity }) => (
                <div className="cart-line" key={product.id}>
                  <img src={product.image} alt={product.alt} />
                  <div className="cart-line-content">
                    <div className="cart-line-title">
                      <div>
                        <p className="eyebrow">{product.categoryLabel}</p>
                        <h3>{product.name}</h3>
                      </div>
                      <button type="button" className="remove-button" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name}`}>Remove</button>
                    </div>
                    <div className="cart-line-foot">
                      <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                        <button type="button" aria-label={`Decrease ${product.name}`} onClick={() => updateQuantity(product.id, quantity - 1)}><Minus size={14} /></button>
                        <span>{quantity}</span>
                        <button type="button" aria-label={`Increase ${product.name}`} onClick={() => updateQuantity(product.id, quantity + 1)}><Plus size={14} /></button>
                      </div>
                      <strong>{formatPrice(product.price * quantity)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="cart-summary">
            <div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <p>Taxes and delivery calculated at checkout.</p>
            <button type="button" className="button button-brass button-wide" onClick={handleCheckout}>Checkout <span aria-hidden="true">↗</span></button>
          </div>
        )}
      </aside>
    </>
  );
}
