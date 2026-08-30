/* LongTail Parisian Atelier Editorial — heritage is an unfolding atelier story, not a corporate about page. */

import { ArrowUpRight } from "lucide-react";

const milestones = [
  { year: "2018", title: "The beginning", copy: "LongTail was born from a simple observation: dachshunds possess an innate elegance that deserves to be celebrated with equally sophisticated accessories. Our founder began creating custom pieces in her studio, combining traditional leatherworking techniques with modern design sensibilities." },
  { year: "2019", title: "First collection", copy: "The debut collection launched with just three pieces: the signature harness, a luxury bed, and artisanal treats. Each piece was meticulously crafted by hand, establishing our reputation for quality and attention to detail." },
  { year: "2020", title: "Artisan partnerships", copy: "We established partnerships with master craftspeople across Europe, each bringing generations of expertise in leatherworking, textiles, and metalwork. These collaborations let us grow while maintaining exacting standards." },
  { year: "2022", title: "Sustainability focus", copy: "Committed to environmental responsibility, we launched our sustainable sourcing initiative, partnering with eco-conscious suppliers and implementing waste reduction practices throughout production." },
  { year: "2024", title: "Global recognition", copy: "LongTail received international acclaim, featured in luxury lifestyle publications and embraced by discerning pet owners worldwide. Our pieces became synonymous with sophisticated pet ownership." },
  { year: "2025", title: "The future", copy: "Today, we continue to push the boundaries of pet luxury, introducing innovative materials, bespoke services, and exclusive collaborations. Our commitment remains unchanged: exceptional pieces that honor the unique bond between dachshunds and their humans." },
];

const values = [
  ["01", "Craftsmanship", "Every piece is meticulously crafted by skilled artisans, combining traditional techniques with modern innovation."],
  ["02", "Compassion", "Our designs prioritize the comfort and wellbeing of dachshunds, enhancing their natural grace."],
  ["03", "Sustainability", "We source materials ethically and implement responsible practices throughout our production process."],
  ["04", "Timelessness", "Our designs transcend trends, focusing on classic elegance and enduring style."],
  ["05", "Excellence", "We hold ourselves to the highest standards, from first sketch to final delivery."],
  ["06", "Community", "We celebrate the unique bond between dachshunds and their humans through shared rituals."],
];

export default function Heritage() {
  return (
    <>
      <section className="page-intro heritage-intro page-pad">
        <span className="eyebrow">The LongTail house <span aria-hidden="true">/</span> since 2018</span>
        <h1>Our <em>heritage.</em></h1>
        <p>A legacy of excellence, where traditional craftsmanship meets contemporary design, creating timeless pieces for the most discerning companions.</p>
      </section>

      <section className="story-section section-pad">
        <div className="story-copy">
          <span className="eyebrow">The LongTail story</span>
          <h2>Born from a belief in<br /><em>the details that matter.</em></h2>
          <p>Founded on the belief that our beloved dachshunds deserve the same level of luxury and craftsmanship that we seek for ourselves, LongTail began as a passion project that quickly evolved into a movement.</p>
          <p>Our founder, inspired by the elegant silhouette and regal bearing of her own dachshund, recognized a gap in the market for truly sophisticated pet accessories. What started as custom pieces for friends and family grew into a brand that redefines pet luxury.</p>
          <p>Today, LongTail stands as a testament to the belief that the bond between humans and their companions deserves to be celebrated with the finest materials, impeccable design, and unwavering attention to detail.</p>
        </div>
        <div className="story-image-wrap"><img src="/manus-storage/longtail-heritage_7e80e162.jpg" alt="A craftsperson carefully stitching leather in the LongTail atelier" /><span className="image-caption"><span>LongTail / atelier no. 01</span><span>Material, hand, time</span></span></div>
      </section>

      <section className="journey-section section-pad">
        <div className="section-heading-row"><div><span className="eyebrow">A considered path</span><h2>Our <em>journey.</em></h2></div><span className="section-number">06 chapters</span></div>
        <p className="section-lede">Milestones that shaped our brand and defined our commitment to excellence.</p>
        <div className="timeline">
          {milestones.map((milestone) => <article key={milestone.year} className="timeline-item"><div className="timeline-year">{milestone.year}</div><div className="timeline-marker"><span /></div><div className="timeline-copy"><h3>{milestone.title}</h3><p>{milestone.copy}</p></div></article>)}
        </div>
      </section>

      <section className="values-section section-pad">
        <div className="section-heading-row"><div><span className="eyebrow">What guides us</span><h2>Our <em>values.</em></h2></div><span className="section-number">06 principles</span></div>
        <p className="section-lede">The principles that guide every decision, from material selection to final craftsmanship.</p>
        <div className="values-grid">{values.map(([number, title, copy]) => <article className="value-card" key={title}><span className="value-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="numbers-section">
        <div className="numbers-head"><span className="eyebrow eyebrow-light">By the numbers</span><p>Our commitment to excellence is reflected in every metric we track.</p></div>
        <div className="numbers-grid"><div><strong>07</strong><span>Years of excellence</span></div><div><strong>4.8k</strong><span>Pieces crafted</span></div><div><strong>24</strong><span>Master artisans</span></div><div><strong>18</strong><span>Countries served</span></div></div>
      </section>

      <section className="society-detail section-pad" id="society-detail">
        <div className="society-detail-copy"><span className="eyebrow">An invitation</span><h2>Join the<br /><em>LongTail Society.</em></h2><p>Become part of an exclusive community of dachshund enthusiasts who appreciate the finer things in life.</p><button type="button" className="button button-dark" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>Join the Society <ArrowUpRight size={15} /></button></div>
        <div className="benefits-list"><span className="eyebrow">Society benefits</span>{[["01", "Early access", "Preview and purchase new collections before they're available to the public."], ["02", "Exclusive events", "Invitations to private trunk shows, styling sessions, and dachshund meetups."], ["03", "Personal styling", "Complimentary consultations with our design team for bespoke recommendations."], ["04", "Member discounts", "Exclusive pricing on select collections and special member-only promotions."]].map(([number, title, copy]) => <div className="benefit" key={title}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div>
      </section>
    </>
  );
}
