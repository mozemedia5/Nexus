import { useEffect, useState } from "react";
import { ArrowUpRight, Sparkles, Cpu, Heart, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import { getCollections, getProducts, shopifyConfigured, type Collection, type Product } from "@/lib/store";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopifyConfigured) return;
    Promise.all([getProducts({ first: 8, sortKey: "BEST_SELLING" }), getCollections(8)])
      .then(([items, groups]) => {
        setProducts(items);
        setCollections(groups);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load the Nexus catalogue."));
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={13} /> Nexus A Liverton Store</span>
          <h1>Smart Home, <em>Beauty &amp; Wellness.</em></h1>
          <p>Curated smart home automation, intelligent gadgets, and elevated beauty &amp; wellness essentials selected for modern, connected living.</p>
          <div className="hero-actions">
            <Link href="/products?collection=smart-home" className="button button-brass">
              Shop Smart Home <ArrowUpRight size={16} />
            </Link>
            <Link href="/products?collection=beauty-wellness" className="button button-quiet">
              Beauty &amp; Wellness
            </Link>
            <Link href="/track-order" className="button button-quiet">
              <PackageCheck size={16} /> Track Order
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-art-shape shape-one" />
          <div className="hero-art-shape shape-two" />
          <div className="hero-art-card">
            <span>01</span>
            <strong>Innovation<br /><em>&amp; Wellbeing.</em></strong>
            <small>Smart Home · Beauty · Wellness</small>
          </div>
        </div>
      </section>

      <section className="value-strip">
        <div>
          <strong><Cpu size={16} /> Smart Home Automation</strong>
          <span>Intelligent tech designed for comfort and peace of mind</span>
        </div>
        <div>
          <strong><Heart size={16} /> Beauty &amp; Wellness</strong>
          <span>Elevated self-care tools and daily wellness essentials</span>
        </div>
        <div>
          <strong><ShieldCheck size={16} /> Shopify Storefront</strong>
          <span>Seamless, secure checkout powered by Shopify</span>
        </div>
      </section>

      <section className="section-pad">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Explore Collections</span>
            <h2>Curated for <em>modern living.</em></h2>
          </div>
          <Link href="/products" className="text-link">
            View all products <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="category-grid">
          {collections.slice(0, 4).map((collection) => (
            <Link key={collection.id} href={`/products?collection=${collection.handle}`} className="category-card">
              {collection.image && <img src={collection.image.url} alt={collection.image.altText ?? collection.title} loading="lazy" />}
              <span>{collection.title}</span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
          {!collections.length && (
            <>
              <Link href="/products?collection=smart-home" className="category-card">
                <span>Smart Home &amp; Automation</span>
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/products?collection=beauty-wellness" className="category-card">
                <span>Beauty &amp; Personal Care</span>
                <ArrowUpRight size={17} />
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="section-pad product-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Nexus Catalogue</span>
            <h2>Featured <em>picks.</em></h2>
          </div>
          <Link href="/products" className="text-link">
            Shop everything <ArrowUpRight size={15} />
          </Link>
        </div>
        {error ? (
          <div className="empty-state">
            <h3>Catalogue unavailable</h3>
            <p>{error}</p>
          </div>
        ) : products.length ? (
          <div className="product-grid home-product-grid">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>{shopifyConfigured ? "Your live products will appear here" : "Shopify connection required"}</h3>
            <p>
              {shopifyConfigured
                ? "Add Smart Home or Beauty products in your Shopify Store and they will appear here automatically."
                : "Add your VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN variables to view live products."}
            </p>
          </div>
        )}
      </section>

      <section className="split-callout">
        <div>
          <span className="eyebrow">Smart Living &amp; Wellness</span>
          <h2>Elevate your home.<br /><em>Nurture yourself.</em></h2>
          <Link href="/products" className="button button-dark">
            Explore Nexus Store <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="callout-panel">
          <span>Nexus note</span>
          <p>We blend cutting-edge home intelligence with daily self-care rituals so every corner of your life feels connected, calm, and effortlessly modern.</p>
        </div>
      </section>

      <section className="faq-section section-pad">
        <div>
          <span className="eyebrow">Support &amp; Fulfillment</span>
          <h2>Frequently asked <em>questions.</em></h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>How do I track my order?</summary>
            <p>You can track your order status in real time by visiting our <Link href="/track-order">Order Tracking page</Link> using your Shopify Order ID or email.</p>
          </details>
          <details>
            <summary>How does checkout work?</summary>
            <p>Your shopping bag is synced directly with Shopify Storefront API and completes on Shopify's secure checkout page.</p>
          </details>
          <details>
            <summary>What categories does Nexus A Liverton Store offer?</summary>
            <p>Nexus specializes exclusively in Smart Home automation and devices alongside Beauty &amp; Wellness products.</p>
          </details>
        </div>
      </section>
    </>
  );
}
