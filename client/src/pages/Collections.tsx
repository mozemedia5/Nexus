/* LongTail Parisian Atelier Editorial — collections turns the lookbook into a practical, filterable catalogue. */

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import ProductCard, { CategoryPills } from "@/components/ProductCard";
import { products } from "@/lib/store";

export default function Collections() {
  const [activeCategory, setActiveCategory] = useState("all");
  const filteredProducts = useMemo(() => activeCategory === "all" ? products : products.filter((product) => product.category === activeCategory), [activeCategory]);

  return (
    <>
      <section className="page-intro page-pad">
        <span className="eyebrow">The LongTail edit <span aria-hidden="true">/</span> 01</span>
        <h1>Our <em>collections.</em></h1>
        <p>From brass hardware for rain-dark mornings to linen made for slow afternoons, discover pieces shaped around the rituals you share with a dachshund.</p>
      </section>

      <section className="catalogue section-pad">
        <div className="catalogue-toolbar">
          <CategoryPills active={activeCategory} onChange={setActiveCategory} />
          <span className="catalogue-count">{filteredProducts.length} pieces</span>
        </div>
        <div className="product-grid catalogue-grid" key={activeCategory}>
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          <article className="catalogue-note-card">
            <span className="section-marker" aria-hidden="true" />
            <span className="eyebrow">Atelier note / 01</span>
            <h3>Good things<br /><em>take the long way.</em></h3>
            <p>Every piece begins with the companion in mind: a soft landing after the walk, a secure clasp, a little more ceremony at the door.</p>
            <Link href="/about" className="text-link">Inside the atelier <ArrowUpRight size={15} /></Link>
          </article>
        </div>
        {filteredProducts.length === 0 && <div className="no-results"><span className="brass-dot" /><p>We are preparing a new edit for this collection.</p></div>}
      </section>

      <section className="signature-section section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">The signature collection</span><h2>Made for the <em>long way home.</em></h2></div>
          <span className="section-number">02 / 02</span>
        </div>
        <p className="section-lede">Our most exclusive pieces, representing the pinnacle of luxury and craftsmanship.</p>
        <div className="signature-grid">
          <article className="signature-card signature-card-large">
            <img src="/manus-storage/longtail-heritage_7e80e162.jpg" alt="Cognac leather being stitched by hand in an atelier" />
            <div className="signature-overlay"><span className="eyebrow eyebrow-light">01 / Limited edition</span><h3>Heritage<br /><em>collection</em></h3><p>Limited edition pieces crafted with traditional techniques and premium materials.</p><Link href="/about" className="button button-quiet-light">Discover heritage <ArrowUpRight size={15} /></Link></div>
          </article>
          <article className="signature-card signature-card-small">
            <img src="/manus-storage/longtail-lifestyle_29b57534.jpg" alt="Dachshund and human walking together in Paris" />
            <div className="signature-overlay"><span className="eyebrow eyebrow-light">02 / By appointment</span><h3>Bespoke<br /><em>service</em></h3><p>Custom-made pieces tailored to your dachshund's unique measurements and preferences.</p><button type="button" className="button button-quiet-light" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>Learn more <ArrowUpRight size={15} /></button></div>
          </article>
        </div>
      </section>
    </>
  );
}
