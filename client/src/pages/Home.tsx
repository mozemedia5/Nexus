/* LongTail Parisian Atelier Editorial — home is the lookbook cover: image-led, warm, and deliberately spacious. */

import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/store";

export default function Home() {
  const featured = products.slice(0, 3);

  return (
    <>
      <section className="home-hero">
        <img src="/manus-storage/longtail-hero_7f0b30f1.jpg" alt="Chocolate dachshund relaxing on a cream chaise lounge" className="hero-image" />
        <div className="hero-wash" />
        <div className="hero-content page-pad">
          <span className="eyebrow eyebrow-light">The house of LongTail <span aria-hidden="true">/</span> est. 2018</span>
          <h1>Timeless luxury<br /><em>for the long way home.</em></h1>
          <p>Where heritage craftsmanship meets contemporary elegance, creating exceptional pieces for the most discerning companions.</p>
          <div className="hero-actions">
            <Link href="/products" className="button button-brass">Shop the collection <ArrowUpRight size={16} /></Link>
            <Link href="/about" className="button button-quiet-light">Discover our heritage <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="hero-scroll"><ArrowDown size={14} /> Scroll to explore</div>
        <div className="hero-index">01 <span>/</span> 03</div>
      </section>

      <section className="intro-section section-pad">
        <div className="intro-kicker"><span className="brass-dot" /> The LongTail lifestyle</div>
        <div className="intro-copy">
          <h2>A brand as unique and enduring as the dachshunds we love.</h2>
          <p>LongTail brings a considered point of view to the everyday rituals you share. Each piece is shaped by a love of fine material, quiet detail, and the very particular character of a long-backed companion.</p>
        </div>
      </section>

      <section className="lifestyle-section">
        <div className="lifestyle-image-panel">
          <img src="/manus-storage/longtail-lifestyle_29b57534.jpg" alt="Dachshund walking through a quiet Parisian street" />
          <div className="image-caption"><span>01</span><span>Parisian elegance</span></div>
        </div>
        <div className="lifestyle-text-panel">
          <span className="eyebrow">A point of view</span>
          <h2>For the rituals<br /><em>worth dressing up.</em></h2>
          <p>From the first walk of the morning to a slow afternoon at home, LongTail makes space for more ceremony in the everyday.</p>
          <Link href="/about" className="text-link">Read our story <ArrowUpRight size={15} /></Link>
          <div className="lifestyle-notes"><span>Material first</span><span>Designed in Europe</span><span>Made to last</span></div>
        </div>
      </section>

      <section className="collection-section section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">The edit</span><h2>Curated collections</h2></div>
          <Link href="/products" className="text-link desktop-only">View all pieces <ArrowUpRight size={15} /></Link>
        </div>
        <p className="section-lede">Each piece is thoughtfully designed to embody the perfect balance of functionality and refined aesthetics.</p>
        <div className="feature-carousel-controls">
          <button type="button" aria-label="Previous collection"><ChevronLeft size={18} /></button>
          <span>01 <i /> 03</span>
          <button type="button" aria-label="Next collection"><ChevronRight size={18} /></button>
        </div>
        <div className="product-grid home-product-grid">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        <Link href="/products" className="text-link mobile-only collection-mobile-link">View all pieces <ArrowUpRight size={15} /></Link>
      </section>

      <section className="heritage-teaser">
        <div className="heritage-teaser-image"><img src="/manus-storage/longtail-heritage_7e80e162.jpg" alt="Hands stitching a cognac leather harness in an atelier" /></div>
        <div className="heritage-teaser-copy">
          <span className="eyebrow">01 / Our heritage</span>
          <h2>The beauty is<br /><em>in the making.</em></h2>
          <p>Traditional craftsmanship, contemporary design, and a deep respect for the bond between dachshunds and their humans.</p>
          <Link href="/about" className="button button-outline">Discover the LongTail story <ArrowUpRight size={15} /></Link>
        </div>
      </section>

      <section className="society-banner section-pad">
        <div className="society-banner-mark">LT</div>
        <div><span className="eyebrow">An invitation</span><h2>Join the LongTail Society.</h2><p>Be the first to discover new collections, exclusive previews, and styling inspiration.</p></div>
        <button type="button" className="button button-dark" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>Join the Society <ArrowUpRight size={15} /></button>
      </section>
    </>
  );
}
