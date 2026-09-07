import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Sparkles, Tag, Megaphone } from "lucide-react";
import ProductCard, { CategoryPills } from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { getCollectionProducts, getCollections, getProducts, type Collection, type Product } from "@/lib/store";
import { getActiveCampaigns } from "@/pages/Admin";

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
  const campaigns = useMemo(() => getActiveCampaigns(), []);

  return (
    <>
      <SEO
        title={`${selected ? selected.title : "All Products"} — Nexus`}
        description={selected?.description || "Browse Nexus catalogue: Smart Home devices, workspace productivity lighting, docking stations, and tech accessories."}
        keywords="Nexus products, Smart Home devices, Workspace productivity, Tech accessories, Desk light bars, Thunderbolt docks"
        canonicalPath={`/products${active !== "all" ? `?collection=${active}` : ""}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": selected ? selected.title : "Store Catalogue",
          "description": selected?.description || "All Smart Home and Workspace Productivity products from Nexus.",
          "url": `https://liverton-nexus.vercel.app/products${active !== "all" ? `?collection=${active}` : ""}`,
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": products.map((prod, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "Product",
                "name": prod.name,
                "url": `https://liverton-nexus.vercel.app/products/${prod.handle}`,
                "image": prod.image?.url,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": prod.price.currencyCode || "USD",
                  "price": prod.price.amount,
                  "availability": prod.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                }
              }
            }))
          }
        }}
      />

      {campaigns.length > 0 && (
        <div className="section-pad pb-0">
          <div className="p-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-black rounded-xl font-bold">
                <Megaphone size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Tag size={10} /> Active Store Campaign
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{campaigns[0].title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{campaigns[0].subtitle}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs rounded-full border border-amber-500/30 shrink-0">
              {campaigns[0].discountBadge}
            </span>
          </div>
        </div>
      )}

      <section className="page-intro py-8 px-4 max-w-7xl mx-auto">
        <span className="eyebrow text-xs uppercase tracking-wider text-amber-600 font-bold">Nexus Catalogue</span>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight mt-1 text-slate-900 dark:text-white">Smart Home &amp; Office Electronics</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">{selected?.description || "Explore our curated Smart Home devices and Workspace Productivity gadgets."}</p>
      </section>

      <section className="catalogue py-6 px-4 max-w-7xl mx-auto">
        <div className="catalogue-toolbar flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <CategoryPills active={active} onChange={setActive} categories={collections.map(({ handle, title }) => ({ handle, title }))} />
          <span className="catalogue-count text-xs font-semibold text-slate-500">{loading ? "Loading..." : `${products.length} products`}</span>
        </div>

        {error ? (
          <div className="empty-state">
            <h3>We couldn’t load the catalogue</h3>
            <p>{error}</p>
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
