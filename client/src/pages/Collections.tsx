import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Sparkles, Tag, Megaphone } from "lucide-react";
import ProductCard, { CategoryPills } from "@/components/ProductCard";
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
