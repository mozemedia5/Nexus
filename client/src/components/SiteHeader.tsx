import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Search, ShoppingBag, PackageCheck, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop All" },
  { href: "/products?collection=smart-home", label: "Smart Home" },
  { href: "/products?collection=workspace-productivity", label: "Workspace" },
  { href: "/products?collection=tech-accessories", label: "Accessories" },
  { href: "/about", label: "Our Story" },
  { href: "/track-order", label: "Track Order" },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <>
      <div className="announcement-bar">
        Nexus A Liverton Store <span>·</span> Smart Home &amp; Office Electronics
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand-lockup" aria-label="Nexus A Liverton Store home">
            <img src="/logo.png" alt="Nexus Logo" className="brand-logo-img h-9 w-auto object-contain" />
            <div className="brand-text-stack">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link href="/products" className="header-icon" aria-label="Search products">
              <Search size={18} />
            </Link>
            <Link href="/track-order" className="header-icon" aria-label="Track order">
              <PackageCheck size={18} />
            </Link>
            <button className="cart-trigger" type="button" onClick={openCart} aria-label={`Open shopping bag with ${itemCount} items`}>
              <ShoppingBag size={19} />
              <span className="cart-label">Bag</span>
              <span className="cart-count">{itemCount}</span>
            </button>
            <button className="menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <div className="mobile-menu-head">
          <span className="eyebrow">Nexus A Liverton Store</span>
          <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="mobile-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-menu-foot">
          <Link href="/track-order" className="text-link">
            <PackageCheck size={15} /> Track Your Order
          </Link>
          <button type="button" className="text-link" onClick={openCart}>
            <ShoppingBag size={15} /> Open your bag
          </button>
        </div>
      </div>
      {menuOpen && <button className="mobile-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
