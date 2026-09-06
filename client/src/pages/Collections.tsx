import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight } from "lucide-react";
import ProductCard, { CategoryPills } from "@/components/ProductCard";
import { getCollectionProducts, getCollections, getProducts, shopifyConfigured, type Collection, type Product } from "@/lib/store";

export default function Collections() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const initial = params.get("collection") ?? "all";
  const [active, setActive] = useState(initial);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setActive(initial);
  }, [initial]);

  useEffect(() => {
    if (!shopifyConfigured) {
      setError("Storefront configuration missing. Please verify Shopify credentials in Vercel.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([
      getCollections(),
      active === "all" ? getProducts({ first: 48, sortKey: "CREATED_AT" }) : getCollectionProducts(active, 48),
    ])
      .then(([groups, items]) => {
        setCollections(groups);
        setProducts(items);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load catalogue."))
      .finally(() => setLoading(false));
  }, [active]);

  const selected = collections.find((item) => item.handle === active);

  return (
    <>
      <section className="page-intro section-pad">
        <span className="eyebrow">Nexus A Liverton Store / Catalogue</span>
        <h1>Smart Home, <em>Beauty &amp; Wellness.</em></h1>
        <p>{selected?.description || "Explore our collection featuring intelligent home devices, beauty essentials, and wellness innovations."}</p>
      </section>

      <section className="catalogue section-pad">
        <div className="catalogue-toolbar">
          <CategoryPills active={active} onChange={setActive} categories={collections.map(({ handle, title }) => ({ handle, title }))} />
          <span className="catalogue-count">{loading ? "Loading..." : `${products.length} products`}</span>
        </div>

        {error ? (
          <div className="empty-state">
            <h3>We couldn’t load the catalogue</h3>
            <p>{error}</p>
          </div>
        ) : !shopifyConfigured ? (
          <div className="empty-state">
            <h3>Catalogue Updating</h3>
            <p>Our store catalogue is currently updating. Please check back shortly or explore our story.</p>
            <Link href="/" className="button button-dark">
              Back Home <ArrowUpRight size={15} />
            </Link>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <h3>Loading live products…</h3>
          </div>
        ) : products.length ? (
          <div className="product-grid catalogue-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No products in this collection yet</h3>
            <p>New items will be arriving soon. Explore our other curated collections above.</p>
          </div>
        )}
      </section>
    </>
  );
}
