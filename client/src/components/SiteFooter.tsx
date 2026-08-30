/* LongTail Parisian Atelier Editorial — footer closes the lookbook with a quiet society invitation. */

import { Link } from "wouter";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column">
          <Link href="/" className="brand-lockup" aria-label="LongTail home">
            <span className="brand-mark-wrap"><img src="/manus-storage/longtail-mark_21fd49bc.png" alt="" className="brand-mark" /></span>
            <span className="brand-name">LongTail</span>
          </Link>
          <p>Timeless luxury for dachshunds and their humans.</p>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Explore</span>
          <Link href="/products">Collections</Link>
          <Link href="/about">Our Heritage</Link>
          <a href="#society">The Society</a>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Follow along</span>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram <span aria-hidden="true">↗</span></a>
          <a href="mailto:hello@longtail.house">hello@longtail.house <span aria-hidden="true">↗</span></a>
        </div>
        <div className="footer-society" id="society">
          <span className="eyebrow">LongTail Society</span>
          <h3>For the ones who notice the details.</h3>
          <button type="button" className="text-link" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>Join the Society <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 LongTail. All rights reserved.</span>
        <span>Made for the long way home.</span>
      </div>
    </footer>
  );
}
