import { ArrowUpRight, Cpu, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

const milestones = [
  {
    year: "2021",
    title: "The Genesis",
    copy: "Nexus was established under Liverton Store with a bold vision: to simplify modern living by curating the finest smart home technologies and elevated beauty & wellness essentials under one house.",
  },
  {
    year: "2022",
    title: "Smart Home Pioneers",
    copy: "We introduced our flagship collection of intelligent home controllers, automated ambient lighting, and climate solutions—bringing effortless smart home automation to modern residences.",
  },
  {
    year: "2023",
    title: "Beauty & Wellness Expansion",
    copy: "Recognizing that technology should also nurture the self, Nexus expanded into intelligent skincare tools, therapeutic wellness gadgets, and daily self-care rituals.",
  },
  {
    year: "2024",
    title: "Digital Ecosystem Integration",
    copy: "To deliver transparent and reliable shopping, Nexus streamlined its digital ecosystem, enabling real-time product availability, direct instant checkout, and live order tracking.",
  },
  {
    year: "2025",
    title: "Connected Future",
    copy: "Today, Nexus A Liverton Store stands as a trusted leader in smart home technology and beauty & wellness curation, continuously setting new benchmarks for quality and convenience.",
  },
];

const values = [
  ["01", "Smart Innovation", "Every product in our Smart Home collection is selected for intuitive usability, energy efficiency, and seamless connectivity."],
  ["02", "Holistic Wellbeing", "Our Beauty & Wellness line blends clinical-grade self-care tech with daily rituals designed to rejuvenate body and mind."],
  ["03", "Exacting Quality", "We partner with trusted global manufacturers to ensure every smart device and beauty essential passes rigorous quality controls."],
  ["04", "Modern Aesthetics", "Functional design should look timeless. Our curation emphasizes clean silhouettes that enhance modern home interiors."],
  ["05", "Transparent Service", "We provide end-to-end transparency with instant live order tracking from store to your doorstep."],
  ["06", "Customer Care", "We stand behind our curation with dedicated support and expert advice for all smart home setups and wellness inquiries."],
];

export default function Heritage() {
  return (
    <>
      <section className="page-intro heritage-intro page-pad">
        <span className="eyebrow">Nexus A Liverton Store / Our Heritage</span>
        <h1>Where innovation meets <em>everyday wellbeing.</em></h1>
        <p>The story of Nexus A Liverton Store—curating cutting-edge Smart Home automation and elevated Beauty &amp; Wellness essentials for modern living.</p>
      </section>

      <section className="story-section section-pad">
        <div className="story-copy">
          <span className="eyebrow">The Nexus Story</span>
          <h2>Built for the future of<br /><em>home and self-care.</em></h2>
          <p>Nexus A Liverton Store was born from a clear realization: the modern home is not just a place to live, but an intelligent ecosystem designed for comfort, peace of mind, and personal wellness.</p>
          <p>We set out to remove complexity from smart home automation and elevate daily self-care. By selecting only high-performance smart controllers, climate devices, and ambient lighting alongside science-backed beauty tools and wellness gadgets, Nexus offers a complete lifestyle upgrade.</p>
          <p>As a proud Liverton Store brand, Nexus combines technological innovation with trusted customer service, secure checkout, and transparent order tracking.</p>
        </div>
        <div className="story-image-wrap">
          <div className="heritage-card-box">
            <span className="eyebrow"><Sparkles size={14} /> Nexus Identity</span>
            <h3>Nexus A Liverton Store</h3>
            <p>Smart Home · Beauty &amp; Wellness</p>
            <div className="heritage-icon-row">
              <div><Cpu size={20} /><span>Smart Automation</span></div>
              <div><Heart size={20} /><span>Beauty Tech</span></div>
              <div><ShieldCheck size={20} /><span>Quality Assured</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="journey-section section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">Our Milestones</span><h2>The <em>Nexus Journey.</em></h2></div>
          <span className="section-number">05 milestones</span>
        </div>
        <p className="section-lede">Key chapters in our evolution as a premier destination for smart home technology and beauty &amp; wellness.</p>
        <div className="timeline">
          {milestones.map((milestone) => (
            <article key={milestone.year} className="timeline-item">
              <div className="timeline-year">{milestone.year}</div>
              <div className="timeline-marker"><span /></div>
              <div className="timeline-copy">
                <h3>{milestone.title}</h3>
                <p>{milestone.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="values-section section-pad">
        <div className="section-heading-row">
          <div><span className="eyebrow">What Guides Us</span><h2>Our <em>Core Values.</em></h2></div>
          <span className="section-number">06 principles</span>
        </div>
        <p className="section-lede">The principles that guide every smart home selection and beauty &amp; wellness launch at Nexus A Liverton Store.</p>
        <div className="values-grid">
          {values.map(([number, title, copy]) => (
            <article className="value-card" key={title}>
              <span className="value-number">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="numbers-section">
        <div className="numbers-head">
          <span className="eyebrow eyebrow-light">Nexus at a glance</span>
          <p>Dedicated to excellence across smart home automation and wellness curation.</p>
        </div>
        <div className="numbers-grid">
          <div><strong>100%</strong><span>Smart Home Focus</span></div>
          <div><strong>24/7</strong><span>Order Tracking</span></div>
          <div><strong>100%</strong><span>Secure Checkout</span></div>
          <div><strong>Premium</strong><span>Beauty &amp; Wellness</span></div>
        </div>
      </section>

      <section className="society-detail section-pad" id="society-detail">
        <div className="society-detail-copy">
          <span className="eyebrow">An Invitation</span>
          <h2>Join the<br /><em>Nexus Club.</em></h2>
          <p>Become part of our community for early access to smart home tech releases and beauty &amp; wellness innovations.</p>
          <button type="button" className="button button-dark" onClick={() => window.dispatchEvent(new CustomEvent("open-society"))}>
            Join Nexus Club <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="benefits-list">
          <span className="eyebrow">Member Benefits</span>
          {[
            ["01", "Early Tech Access", "Preview and purchase new smart home controllers before public releases."],
            ["02", "Exclusive Promotions", "Enjoy special member pricing on selected beauty & wellness gadgets."],
            ["03", "Order Support", "Dedicated priority help for setting up devices and tracking deliveries."],
            ["04", "Innovation Updates", "Stay informed on the latest trends in smart automation and skincare tech."]
          ].map(([number, title, copy]) => (
            <div className="benefit" key={title}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
