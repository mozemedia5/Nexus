import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  House,
  Store,
  Tags,
  BookOpen,
  Menu,
  PackageCheck,
  ShoppingCart,
  UserRound,
  X,
  LogOut,
  Mail,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { useCart } from "@/contexts/CartContext";
import { clearStoreProfile, useStoreAccount } from "@/hooks/useStoreAccount";
import { getFirebaseAuth } from "@/lib/firebase";
import { getCollections, type Collection } from "@/lib/store";

const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/products", label: "All products", icon: Store },
  { href: "/about", label: "Our story", icon: BookOpen },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("nexus_store_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const [storeCollections, setStoreCollections] = useState<Collection[]>([]);
  const { itemCount, openCart } = useCart();
  const { profile, loading } = useStoreAccount();
  const currentSearch = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);

  useEffect(() => setMenuOpen(false), [location]);

  useEffect(() => {
    let cancelled = false;
    getCollections(20).then((items) => { if (!cancelled) setStoreCollections(items); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem("nexus_store_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth).catch(() => {});
    clearStoreProfile();
  };

  const openNewsletter = () => window.dispatchEvent(new CustomEvent("open-society"));

  return (
    <>
      <header className={`site-header shop-sidebar ${collapsed ? "is-collapsed" : ""} ${menuOpen ? "mobile-open" : ""}`}>
        <div className="shop-sidebar-top">
          <Link href="/" className="brand-lockup" aria-label="Nexus home">
            <img src="/logo.png" alt="" className="brand-logo-img h-8 w-auto object-contain" />
            <div className="brand-text-stack shop-sidebar-brand-text">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <div className="shop-sidebar-controls">
            <button type="button" className="shop-sidebar-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
            <button type="button" className="shop-mobile-menu-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button type="button" className="shop-mobile-cart" onClick={openCart} aria-label={`Open cart with ${itemCount} items`}>
              <ShoppingCart size={18} /><span>{itemCount}</span>
            </button>
          </div>
        </div>

        <div className="shop-sidebar-content">
          <span className="shop-sidebar-section-label">Shop</span>
          <nav className="shop-sidebar-nav" aria-label="Main navigation">
            {[...links, ...storeCollections.map((collection) => ({ href: `/products?collection=${encodeURIComponent(collection.handle)}`, label: collection.title, icon: Tags }))].map(({ href, label, icon: Icon }) => {
              const targetSearch = href.includes("?") ? new URLSearchParams(href.split("?")[1]) : null;
              const isActive = href === "/"
                ? location === "/"
                : location.split("?")[0] === href.split("?")[0] && (targetSearch
                  ? targetSearch.get("collection") === currentSearch.get("collection")
                  : !currentSearch.has("collection"));
              return (
                <Link key={href} href={href} className={`shop-sidebar-link ${isActive ? "is-active" : ""}`} title={collapsed ? label : undefined} aria-current={isActive ? "page" : undefined}>
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="shop-sidebar-lower">
            <span className="shop-sidebar-section-label">Account</span>
            {profile ? (
              <div className="shop-account-card">
                <span className="shop-account-avatar" aria-hidden="true"><UserRound size={17} /></span>
                <span className="shop-account-copy"><strong>{profile.name}</strong><small>Signed in</small></span>
                <button type="button" className="shop-signout" onClick={handleSignOut} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
              </div>
            ) : !loading ? (
              <Link href="/login" className="shop-sidebar-link" title={collapsed ? "Sign in" : undefined}>
                <UserRound size={18} strokeWidth={1.8} /><span>Sign in</span>
              </Link>
            ) : null}
            <Link href="/track-order" className="shop-sidebar-link" title={collapsed ? "Track an order" : undefined}>
              <PackageCheck size={18} strokeWidth={1.8} /><span>Track an order</span>
            </Link>
            <button type="button" className="shop-sidebar-link shop-newsletter-link" onClick={openNewsletter} title={collapsed ? "Newsletter" : undefined}>
              <Mail size={18} strokeWidth={1.8} /><span>Newsletter</span>
            </button>
          </div>

          <div className="shop-sidebar-bottom">
            <button type="button" className="shop-cart-button" onClick={openCart} title={collapsed ? `Cart (${itemCount})` : undefined}>
              <ShoppingCart size={18} strokeWidth={1.8} />
              <span>View cart</span>
              <b>{itemCount}</b>
            </button>
            <p>Thoughtful finds for home and work.</p>
          </div>
        </div>
      </header>
      {menuOpen && <button type="button" className="shop-mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
