import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Search, ShoppingBag, PackageCheck, X, Home, Store, Sparkles, Cable, Accessibility, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop All", icon: Store },
  { href: "/products?collection=smart-home", label: "Smart Home", icon: Sparkles },
  { href: "/products?collection=workspace-productivity", label: "Workspace", icon: Cable },
  { href: "/products?collection=tech-accessories", label: "Accessories", icon: Accessibility },
  { href: "/about", label: "Our Story", icon: null },
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
            <img src="/logo.png" alt="Nexus Logo" className="brand-logo-img h-8 w-auto object-contain" />
            <div className="brand-text-stack">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.icon && <link.icon size={14} strokeWidth={2} />}
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link href="/login" className="header-icon" aria-label="Sign in to your account">
              <User size={16} />
            </Link>
            <Link href="/products" className="header-icon" aria-label="Search products">
              <Search size={16} />
            </Link>
            <Link href="/track-order" className="header-icon" aria-label="Track order">
              <PackageCheck size={16} />
            </Link>
            <button className="cart-trigger" type="button" onClick={openCart} aria-label={`Open shopping bag with ${itemCount} items`}>
              <ShoppingBag size={17} />
              <span className="cart-label">Bag</span>
              <span className="cart-count">{itemCount}</span>
            </button>
            <button className="menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <div className="mobile-menu-head">
          <span className="eyebrow">Nexus A Liverton Store</span>
          <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="mobile-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>          <div className="mobile-menu-foot flex flex-col gap-3">
          <Link href="/login" className="text-link">
            <User size={14} /> Sign In / Register
          </Link>
          <Link href="/track-order" className="text-link">
            <PackageCheck size={14} /> Track Your Order
          </Link>
          <button type="button" className="text-link" onClick={openCart}>
            <ShoppingBag size={14} /> Open your bag
          </button>
        </div>
      </div>
      {menuOpen && <button className="mobile-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
