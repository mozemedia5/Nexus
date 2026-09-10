import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Sparkles, Tag, Megaphone, Camera, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [imageSearchActive, setImageSearchActive] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [tempPublicId, setTempPublicId] = useState<string | null>(null);

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageSearchLoading(true);
    try {
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "nexus/temp-search", resourceType: "image" }),
      });
      if (!sigRes.ok) throw new Error("Could not prepare image upload");

      const sigData = await sigRes.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", String(sigData.timestamp));
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);
      if (sigData.uploadPreset) formData.append("upload_preset", sigData.uploadPreset);

      const cloudUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`;
      const uploadRes = await fetch(cloudUrl, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.secure_url) {
        setTempPublicId(uploadData.public_id || null);
        const searchRes = await fetch("/api/search/image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadData.secure_url, publicId: uploadData.public_id }),
        });
        const searchResult = await searchRes.json();
        setImageSearchActive(true);
        if (searchResult.detectedCategory === "smart-home") {
          setActive("smart-home");
        } else {
          setActive("workspace-productivity");
        }
        toast.success("Visual image search completed! Catalog filtered.");
      } else {
        throw new Error("Image upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process image search");
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleClearImageSearch = async () => {
    if (tempPublicId) {
      try {
        await fetch("/api/cloudinary/destroy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: tempPublicId, resourceType: "image" }),
        });
      } catch {}
    }
    setTempPublicId(null);
    setImageSearchActive(false);
    setSearchQuery("");
    toast.info("Cleared image search filter");
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

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
        <div className="catalogue-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <CategoryPills active={active} onChange={setActive} categories={collections.map(({ handle, title }) => ({ handle, title }))} />

          {/* Search & Image Search Tool */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-8 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Camera Image Search Input */}
            <label
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                imageSearchActive
                  ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title="Upload image to search visually via Cloudinary"
            >
              {imageSearchLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Camera size={15} />
              )}
              <span className="hidden sm:inline">Image Search</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSearch}
                disabled={imageSearchLoading}
                className="hidden"
              />
            </label>

            {imageSearchActive && (
              <button
                type="button"
                onClick={handleClearImageSearch}
                className="px-2 py-1 bg-rose-500/10 text-rose-500 text-xs font-bold rounded-lg hover:bg-rose-500/20"
                title="Clear visual image search filter"
              >
                Clear Visual Filter
              </button>
            )}

            <span className="catalogue-count text-xs font-semibold text-slate-500 ml-2">
              {loading ? "Loading..." : `${filteredProducts.length} products`}
            </span>
          </div>
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
        ) : filteredProducts.length ? (
          <div className="product-grid catalogue-grid">
            {filteredProducts.map((product) => (
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
