/* LongTail Parisian Atelier Editorial — the header is a quiet boutique signpost with a mobile-first escape route. */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Collections" },
  { href: "/about", label: "Heritage" },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <>
      <div className="announcement-bar">
        Complimentary delivery on orders over $150 <span aria-hidden="true">·</span> The LongTail Society is now open
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand-lockup" aria-label="LongTail home">
            <span className="brand-mark-wrap"><img src="/manus-storage/longtail-mark_21fd49bc.png" alt="" className="brand-mark" /></span>
            <span className="brand-name">LongTail</span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`nav-link ${location === link.href || (link.href !== "/" && location.startsWith(link.href)) ? "is-active" : ""}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button className="cart-trigger" type="button" onClick={openCart} aria-label={`Open shopping bag with ${itemCount} items`}>
              <ShoppingBag size={19} strokeWidth={1.6} />
              <span className="cart-label">Bag</span>
              <span className="cart-count" aria-live="polite">{itemCount}</span>
            </button>
            <button className="menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
              <Menu size={22} strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-head">
          <span className="eyebrow">The LongTail house</span>
          <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={22} /></button>
        </div>
        <nav aria-label="Mobile navigation" className="mobile-nav">
          {links.map((link, index) => (
            <Link key={link.href} href={link.href} className="mobile-nav-link"><span>0{index + 1}</span>{link.label}</Link>
          ))}
        </nav>
        <div className="mobile-menu-foot">
          <p>Considered pieces for the long way home.</p>
          <button type="button" className="text-link" onClick={openCart}>Open your bag <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      {menuOpen && <button className="mobile-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
