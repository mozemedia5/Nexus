import { ArrowUpRight, Cpu, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

const milestones = [
  {
    year: "2021",
    title: "The Genesis",
    copy: "Nexus was established under Liverton Store with a bold vision: to simplify modern living by curating high-performance smart home technologies and workspace productivity tools.",
  },
  {
    year: "2022",
    title: "Smart Home Pioneers",
    copy: "We introduced our flagship collection of intelligent ambient lighting, climate monitors, and automated sensors—bringing effortless smart automation to modern homes.",
  },
  {
    year: "2023",
    title: "Workspace Elevation",
    copy: "Recognizing the demands of modern remote and office work, Nexus launched ergonomic desk light bars, Thunderbolt docks, and focus tools.",
  },
  {
    year: "2024",
    title: "Digital Ecosystem Integration",
    copy: "To deliver transparent and reliable shopping, Nexus streamlined its digital ecosystem, enabling real-time product availability, direct instant checkout, and live order tracking.",
  },
  {
    year: "2025",
    title: "Rebranded Excellence",
    copy: "Today, Nexus stands exclusively focused on smart home automation and workspace productivity gadgets, setting new benchmarks for high-tech living.",
  },
];

const values = [
  ["01", "Smart Automation", "Every device in our Smart Home collection is selected for intuitive usability, energy efficiency, and seamless connected routines."],
  ["02", "Workspace Ergonomic", "Our desk lighting, docks, and stands are engineered to eliminate strain, organize clutter, and maximize daily focus."],
  ["03", "Exacting Quality", "We partner with trusted global manufacturers to ensure every smart gadget passes rigorous performance controls."],
  ["04", "Modern Aesthetics", "Functional design should look timeless. Our curation emphasizes clean, minimalist silhouettes that enhance modern workspace and interior aesthetics."],
  ["05", "Transparent Service", "We provide end-to-end transparency with instant live order tracking from store to your doorstep."],
  ["06", "Expert Support", "We stand behind our curation with dedicated support for device setup and workstation optimization."],
];

export default function Heritage() {
  return (
    <>
      <SEO
        title="Our Story & Heritage — Nexus"
        description="Discover the story behind Nexus — curating cutting-edge Smart Home automation devices and high-performance Workspace Productivity gadgets."
        keywords="Nexus story, Smart Home automation, Workspace productivity, Desk gadgets, About Nexus"
        canonicalPath="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "Our Story & Heritage - Nexus",
          "description": "Learn about Nexus's mission to curate intelligent home automation devices and ergonomic workspace gadgets.",
          "url": "https://liverton-nexus.vercel.app/about",
          "publisher": {
            "@type": "Organization",
            "name": "Nexus A Liverton Store",
            "url": "https://liverton-nexus.vercel.app"
          }
        }}
      />
      <section className="page-intro heritage-intro page-pad">
        <span className="eyebrow">Nexus / Our Heritage</span>
        <h1>Engineered for <em>Modern Living &amp; Work.</em></h1>
        <p>The story of Nexus—curating cutting-edge Smart Home automation and workspace productivity gadgets designed for focus, comfort, and intelligent control.</p>
      </section>

      <section className="story-section section-pad">
        <div className="story-copy">
          <span className="eyebrow">The Nexus Story</span>
          <h2>Built for the future of<br /><em>home and office.</em></h2>
          <p>Nexus was born from a clear realization: modern work and home environments demand high-tech, intuitive gadgets that reduce friction, improve productivity, and enhance everyday comfort.</p>
          <p>We set out to eliminate complexity. By selecting only high-performance ambient light bars, ergonomic desk lamps, Thunderbolt docking stations, and connected home sensors, Nexus delivers a premium lifestyle upgrade.</p>
          <p>As a proud Liverton Store brand, Nexus combines technological innovation with trusted customer service, secure checkout, and transparent order tracking.</p>
        </div>
        <div className="story-image-wrap">
          <div className="heritage-card-box">
            <span className="eyebrow"><Sparkles size={14} /> Nexus Identity</span>
            <h3>Nexus</h3>
            <p>Smart Home · Workspace Productivity</p>
            <div className="heritage-icon-row">
              <div><Cpu size={20} /><span>Smart Automation</span></div>
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
