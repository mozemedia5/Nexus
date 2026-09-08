import { Link } from "wouter";

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column">
          <Link href="/" className="brand-lockup" aria-label="Nexus A Liverton Store home">
            <img src="/logo.png" alt="Nexus Logo" className="brand-logo-img h-9 w-auto object-contain" />
            <div className="brand-text-stack">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <p>Smart Home &amp; Workspace Productivity gadgets curated for elevated modern living.</p>

          <div className="footer-socials flex flex-wrap gap-3 mt-4">
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="TikTok">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-1.22v-3.5a6.38 6.38 0 1 0 6.34 6.38V9.7a8.27 8.27 0 0 0 4.77 1.52V7.72a4.85 4.85 0 0 1-1-.03z"/></svg>
            </a>
            <a href="https://wa.me" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="WhatsApp">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.81 9.81 0 0 0 12.04 2zm5.8 14.12c-.24.68-1.2 1.24-1.97 1.3-.53.04-1.22.18-3.95-.92-2.96-1.2-4.88-4.2-5.03-4.4-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.47.27-.29.6-.36.8-.36.2 0 .4 0 .58.01.19.01.44-.07.69.52.26.61.88 2.15.96 2.3.08.15.13.33.03.53-.1.2-.15.32-.3.5-.15.18-.32.4-.46.54-.15.15-.31.31-.13.62.18.31.79 1.3 1.7 2.11 1.17 1.04 2.15 1.36 2.46 1.51.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.42-.26.71-.15.29.11 1.86.88 2.18 1.04.32.16.53.24.61.37.08.13.08.77-.16 1.45z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="Instagram">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="X">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="Facebook">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-icon hover:opacity-80 transition-opacity" aria-label="YouTube">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Catalogue</span>
          <Link href="/products">All Products</Link>
          <Link href="/products?collection=smart-home">Smart Home</Link>
          <Link href="/products?collection=workspace-productivity">Workspace Productivity</Link>
          <Link href="/products?collection=tech-accessories">Tech Accessories</Link>
          <Link href="/about">Our Story</Link>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Customer Care</span>
          <Link href="/track-order">Order Tracking</Link>
          <a href="mailto:support@nexus.liverton.store">Contact Support <span aria-hidden="true">↗</span></a>
        </div>
        <div className="footer-society" id="society">
          <span className="eyebrow">Nexus Club</span>
          <h3>Innovation meets everyday wellbeing.</h3>
          <p>Subscribe for exclusive updates on smart home releases and wellness launches.</p>
          <button type="button" className="text-link" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>
            Join Nexus Club <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <div className="footer-bottom flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© 2020–{currentYear} Liverton Stores. All rights reserved.</span>
        <div className="flex gap-4 text-xs">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
