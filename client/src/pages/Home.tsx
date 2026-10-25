import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Headphones,
  HeartHandshake,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { getCollections, getProducts, type Collection, type Product } from "@/lib/store";

const visualStories = [
  { image: "/nexus-editorial-fashion.jpg", alt: "Everyday pieces in warm, natural tones", name: "Everyday style", link: "/products", note: "Considered essentials, made to be lived in." },
  { image: "/nexus-editorial-audio.jpg", alt: "Sculptural wireless headphones on a stone display", name: "Sound, softened", link: "/products", note: "Beautifully useful tech for every day." },
  { image: "/nexus-editorial-home.jpg", alt: "Calm home objects in cream linen and ceramic", name: "A softer home", link: "/products", note: "Small details that make a room feel yours." },
  { image: "/nexus-editorial-desk.jpg", alt: "A refined desk setup in cream and sage", name: "The good-work edit", link: "/smart-office", note: "An easier rhythm for your working day." },
];

function SectionHeading({ label, title, href = "/products", linkText = "Shop the edit" }: { label: string; title: string; href?: string; linkText?: string }) {
  return (
    <div className="nexus-section-heading">
      <div><span className="nexus-eyebrow">{label}</span><h2>{title}</h2></div>
      <Link href={href} className="nexus-text-link">{linkText}<ArrowUpRight size={15} /></Link>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getProducts({ first: 12, sortKey: "BEST_SELLING", fresh: true }),
      getProducts({ first: 8, sortKey: "CREATED_AT", fresh: true }),
      getCollections(250),
    ])
      .then(([bestSellers, arrivals, groups]) => {
        if (cancelled) return;
        setProducts(bestSellers);
        setNewestProducts(arrivals);
        setCollections(groups);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load catalogue."); });
    return () => { cancelled = true; };
  }, []);

  const storyCollections = useMemo(() => collections.slice(0, 4), [collections]);
  const bestSellers = useMemo(() => products.slice(0, 4), [products]);
  const arrivals = useMemo(() => newestProducts.slice(0, 4), [newestProducts]);
  const shopMore = useMemo(() => products.slice(4, 8), [products]);
  const storyProducts = useMemo(() => products.slice(8, 11), [products]);

  return (
    <>
      <SEO title="Nexus — Thoughtful Finds for Everyday Living" description="Discover useful finds for home, work and all the moments in between. Shop the latest from Nexus." keywords="Nexus, curated home, workspace, everyday essentials, thoughtful finds" canonicalPath="/" />
      <div className="nexus-home">
        {/* 1 — Signature campaign hero */}
        <section className="nexus-hero" aria-labelledby="nexus-hero-title">
          <img className="nexus-hero-photo" src="/nexus-hero.jpg" alt="Nexus everyday essentials in a sunlit cream studio" fetchPriority="high" />
          <div className="nexus-hero-shade" />
          <div className="nexus-hero-copy">
            <span className="nexus-eyebrow"><Sparkles size={13} /> THE EVERYDAY, ELEVATED</span>
            <h1 id="nexus-hero-title">Good things<br />for <em>good living.</em></h1>
            <p>Thoughtful finds for the home, your workspace, and all the little rituals in between.</p>
            <div className="nexus-hero-actions">
              <Link href="/products" className="nexus-button nexus-button-dark">Shop now <ArrowRight size={16} /></Link>
              <button type="button" className="nexus-button nexus-button-glass" onClick={() => window.dispatchEvent(new CustomEvent("nexus-open-cari"))}>Ask Cari <Sparkles size={15} /></button>
            </div>
            <div className="nexus-social-proof"><span className="nexus-proof-dots"><i>N</i><i>L</i><i>+</i></span><span>Useful finds. Happier everyday.</span></div>
          </div>
          <div className="nexus-hero-note"><span>THE NEXUS EDIT</span><strong>Little upgrades.<br />Lovely big difference.</strong></div>
          <div className="nexus-hero-pagination"><span>01</span><i /> 04</div>
        </section>

        {/* 2 — Four shopping promises */}
        <section className="nexus-benefits" aria-label="Shopping benefits">
          <div><Truck /><span><strong>Thoughtfully chosen</strong><small>Useful things, lovely details</small></span></div>
          <div><ShieldCheck /><span><strong>Secure checkout</strong><small>Shop with peace of mind</small></span></div>
          <div><PackageCheck /><span><strong>Order tracking</strong><small>Every parcel, in the know</small></span></div>
          <div><HeartHandshake /><span><strong>A little help, always</strong><small>Cari is here when you need her</small></span></div>
        </section>

        {/* 3 — Live shopping collections */}
        <section className="nexus-section nexus-collections" id="collections">
          <SectionHeading label="A place for everything" title="Find your kind of lovely." linkText="All collections" />
          {storyCollections.length ? <div className="nexus-collection-grid">
            {storyCollections.map((collection, index) => <Link key={collection.id} href={`/products?collection=${encodeURIComponent(collection.handle)}`} className={`nexus-collection-card collection-${index}`}>
              <img src={collection.image?.url || visualStories[index].image} alt={collection.image?.altText || collection.title} loading="lazy" />
              <span className="nexus-collection-overlay" /><span className="nexus-collection-copy"><small>EXPLORE THE EDIT</small><strong>{collection.title}</strong><i>Shop now <ArrowRight size={14} /></i></span>
            </Link>)}
          </div> : <div className="nexus-category-fallback">{visualStories.map((story) => <Link key={story.name} href={story.link} className="nexus-category-card"><img src={story.image} alt={story.alt} loading="lazy" /><span>{story.name}<ArrowUpRight size={14} /></span></Link>)}</div>}
        </section>

        {/* 4 — Curated best sellers */}
        <section className="nexus-section nexus-product-section" id="bestsellers">
          <SectionHeading label="The ones you love" title="Good finds, loved often." />
          {error ? <p className="nexus-empty-state">{error}</p> : bestSellers.length ? <div className="nexus-product-grid">{bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="nexus-empty-state">Our latest finds are on their way. Check back soon.</p>}
        </section>

        {/* 5 — Image-led story: everyday style */}
        <section className="nexus-story nexus-story-first">
          <div className="nexus-story-image"><img src={visualStories[0].image} alt={visualStories[0].alt} loading="lazy" /><span className="nexus-image-caption">THE EVERYDAY EDIT · 01</span></div>
          <div className="nexus-story-copy"><span className="nexus-eyebrow">MADE FOR YOUR EVERY DAY</span><h2>Useful can be<br /><em>a beautiful thing.</em></h2><p>From the first coffee to the final to-do, we believe the things you reach for every day should feel a little more special.</p><Link href="/products" className="nexus-button nexus-button-outline">Find your next favourite <ArrowRight size={15} /></Link><div className="nexus-handwritten">A little lovely goes a long way.</div></div>
        </section>

        {/* 6 — New arrivals */}
        <section className="nexus-section nexus-new-arrivals" id="new-arrivals">
          <SectionHeading label="Freshly found" title="Just landed at Nexus." href="/new-arrivals" linkText="See what's new" />
          {arrivals.length ? <div className="nexus-product-grid">{arrivals.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="nexus-arrival-empty"><span>COMING IN SOON</span><p>New favourites are on their way.</p><Link href="/products">Browse all finds <ArrowRight size={14} /></Link></div>}
        </section>

        {/* 7 — Shop by mood, four image-led edits */}
        <section className="nexus-editorial-section">
          <div className="nexus-editorial-head"><span className="nexus-eyebrow">A FEW THINGS WE LOVE</span><h2>Little worlds of <em>lovely.</em></h2><p>Pick a mood. Find something that feels just right.</p></div>
          <div className="nexus-editorial-grid">{visualStories.map((story, index) => <Link key={story.name} href={story.link} className="nexus-editorial-card"><div className="nexus-editorial-photo"><img src={story.image} alt={story.alt} loading="lazy" /><span>0{index + 1}</span></div><div className="nexus-editorial-copy"><h3>{story.name}</h3><p>{story.note}</p><span>Get yours <ArrowUpRight size={14} /></span></div></Link>)}</div>
        </section>

        {/* 8 — Another live-product edit */}
        {shopMore.length > 0 && <section className="nexus-section nexus-product-section nexus-second-product-edit">
          <SectionHeading label="A little more to love" title="Everyday favourites." />
          <div className="nexus-product-grid">{shopMore.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>}

        {/* 9 — Cari shopping assistant feature */}
        <section className="nexus-cari-feature">
          <div className="nexus-cari-orbit orbit-one" /><div className="nexus-cari-orbit orbit-two" />
          <div className="nexus-cari-stamp"><Sparkles size={24} /><span>N</span></div>
          <div className="nexus-cari-copy"><span className="nexus-eyebrow">YOUR LITTLE SHOPPING SIDEKICK</span><h2>Meet Cari.<br /><em>She gets your style.</em></h2><p>Not sure where to start? Ask Cari to discover a new favourite, compare a couple of finds, or help you pick the perfect gift.</p><button type="button" className="nexus-button nexus-button-dark" onClick={() => window.dispatchEvent(new CustomEvent("nexus-open-cari"))}>Ask Cari <Sparkles size={15} /></button></div>
          {storyProducts.length > 0 && <div className="nexus-cari-products">{storyProducts.map((product) => <div className="nexus-cari-product" key={product.id}><img src={product.image?.url || product.images[0]?.url || "/logo.png"} alt={product.image?.altText || product.name} loading="lazy" /><span>{product.name}</span></div>)}</div>}
          <span className="nexus-cari-side-note">YOUR CART, CONSIDERED.</span>
        </section>

        {/* 10 — Support and final shop call to action */}
        <section className="nexus-faq-section">
          <div className="nexus-faq-intro"><span className="nexus-eyebrow">HERE IF YOU NEED US</span><h2>Good to<br />know.</h2><p>Little questions, helpful answers. If you need more, Cari is only a tap away.</p><button type="button" className="nexus-text-link" onClick={() => window.dispatchEvent(new CustomEvent("nexus-open-cari"))}>Ask Cari anything <ArrowRight size={15} /></button></div>
          <div className="nexus-faq-list">
            <details><summary>Where is my order? <ChevronRight size={16} /></summary><p>Follow your parcel from checkout to doorstep on our <Link href="/track-order">order tracking page</Link>. You’ll need your order ID and verification contact.</p></details>
            <details><summary>How do I find my next favourite? <ChevronRight size={16} /></summary><p>Browse our curated collections, explore the newest finds, or ask Cari for a personal recommendation.</p></details>
            <details><summary>Is it safe to shop with Nexus? <ChevronRight size={16} /></summary><p>Our checkout is designed with your security in mind. Your account details stay private and protected.</p></details>
          </div>
        </section>
        <section className="nexus-final-cta"><BadgeCheck size={18} /><span>Find something lovely for your every day.</span><Link href="/products">Get yours <ArrowRight size={15} /></Link></section>
      </div>
    </>
  );
}
