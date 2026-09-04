import { Link } from "wouter";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column">
          <Link href="/" className="brand-lockup" aria-label="Nexus A Liverton Store home">
            <span className="brand-mark-wrap">N</span>
            <div className="brand-text-stack">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <p>Smart Home, Beauty &amp; Wellness essentials curated for elevated modern living.</p>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Catalogue</span>
          <Link href="/products">All Products</Link>
          <Link href="/products?collection=smart-home">Smart Home</Link>
          <Link href="/products?collection=beauty-wellness">Beauty &amp; Wellness</Link>
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
      <div className="footer-bottom">
        <span>© 2025 Nexus A Liverton Store. All rights reserved.</span>
        <span>Smart Home · Beauty &amp; Wellness</span>
      </div>
    </footer>
  );
}
