import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, ChevronLeft, ChevronRight, Camera, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { getProduct, formatPrice, shopifyConfigured, type Product } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";
import SEO from "@/components/SEO";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [error, setError] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    if (!params?.handle) return;
    getProduct(params.handle)
      .then((item) => {
        setProduct(item);
        setSelected(item?.variants.find((variant) => variant.availableForSale)?.id ?? item?.variants[0]?.id ?? "");
        if (item) {
          try {
            fetch("/api/user/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "view",
                productTitle: item.name,
                category: item.categoryLabel,
              }),
            }).catch(() => {});
          } catch {}
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load this product."));
  }, [params?.handle]);

  if (error)
    return (
      <div className="empty-state page-pad">
        <h2>Product unavailable</h2>
        <p>{error}</p>
        <Link href="/products" className="button button-dark mt-4">Return to catalogue</Link>
      </div>
    );

  if (!product)
    return (
      <div className="empty-state page-pad">
        <h2>Loading product details...</h2>
      </div>
    );

  const images = product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
  const currentImage = images[activeImageIndex] ?? product.image;
  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];

  const add = async () => {
    await addItem(product, variant?.id, quantity);
    try {
      fetch("/api/user/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_to_cart",
          productTitle: product.name,
          category: product.categoryLabel,
        }),
      }).catch(() => {});
    } catch {}
    toast.success("Added to your shopping bag", { description: `${product.name} (x${quantity})` });
  };

  const goImage = (dir: number) => {
    setActiveImageIndex((prev) => (prev + dir + images.length) % images.length);
  };

  return (
    <>
      <SEO
        title={`${product.name} — Nexus`}
        description={product.description || `Buy ${product.name} at Nexus. Smart Home automation and workspace gadgets.`}
        keywords={`${product.name}, ${product.categoryLabel || "Smart Home"}, Nexus`}
        image={currentImage?.url}
        canonicalPath={`/products/${product.handle}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description,
          "image": images.map((img) => img.url),
          "category": product.categoryLabel,
          "offers": {
            "@type": "Offer",
            "priceCurrency": variant?.price.currencyCode || product.price.currencyCode || "USD",
            "price": variant?.price.amount || product.price.amount,
            "availability": variant?.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": `https://liverton-nexus.vercel.app/products/${product.handle}`,
            "seller": {
              "@type": "Organization",
              "name": "Nexus A Liverton Store"
            }
          }
        }}
      />
      <section className="product-detail section-pad max-w-7xl mx-auto">
      <Link href="/products" className="back-link inline-flex items-center gap-2 text-sm mb-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={15} /> Back to catalogue
      </Link>
      <div className="product-detail-grid">
        <div className="product-gallery flex flex-col gap-4">
          <div className="main-image-frame overflow-hidden rounded-xl bg-neutral-100 border border-border/50 aspect-square flex items-center justify-center relative group">
            <img
              src={currentImage?.url ?? "/logo.png"}
              alt={currentImage?.altText ?? product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => goImage(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md" aria-label="Previous image">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => goImage(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md" aria-label="Next image">
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            {/* Image Analysis Button */}
            <button
              type="button"
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-amber-500 hover:text-white"
              title="Analyze this image"
              aria-label="Analyze product image"
            >
              <Camera size={14} />
            </button>
            {showAnalysis && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6 z-10 rounded-xl">
                <div className="text-center text-white max-w-sm">
                  <Sparkles size={24} className="mx-auto mb-3 text-amber-400" />
                  <h4 className="text-sm font-bold mb-2">Image Analysis</h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    This product features a {product.categoryLabel.toLowerCase()} design with premium materials and build quality. Optimized for seamless integration into modern smart home ecosystems and productive workspace environments.
                  </p>
                  <button type="button" onClick={() => setShowAnalysis(false)} className="mt-3 text-xs text-amber-400 underline">
                    Close Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="product-thumbs flex flex-wrap gap-2">
              {images.map((item, idx) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? "border-foreground scale-105" : "border-border/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info flex flex-col gap-5">
          <div>
            <span className="eyebrow text-xs tracking-wide text-muted-foreground">{product.categoryLabel || "Nexus Collection"}</span>
            <h1 className="text-2xl font-serif font-medium mt-1 text-foreground">{product.name}</h1>
          </div>
          <div className="detail-price flex items-baseline gap-3 text-xl font-medium">
            <strong>{formatPrice(variant?.price ?? product.price)}</strong>
            {product.compareAtPrice && <del className="text-sm text-muted-foreground font-normal">{formatPrice(product.compareAtPrice)}</del>}
          </div>
          {/* Segmented Description */}
          <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300 border-t border-b border-slate-200 dark:border-slate-800 py-4">
            <div>
              <h4 className="text-xs font-bold tracking-wide text-amber-600 dark:text-amber-400 mb-1.5">
                Overview
              </h4>
              <p className="leading-relaxed">
                {product.description?.split(/(?<=\.)\s+/)[0] || product.description || "A smart home or workspace productivity gadget curated by Nexus."}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold tracking-wide text-amber-600 dark:text-amber-400 mb-2">
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {(product.description?.split(/(?<=\.)\s+/).slice(1).length ? product.description.split(/(?<=\.)\s+/).slice(1) : [
                  "Precision-engineered build quality for long-lasting daily productivity.",
                  "Seamless integration with modern desk and smart home environments.",
                  "Energy-efficient performance with intelligent environmental controls."
                ]).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold tracking-wide text-slate-400 block">Category</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{product.categoryLabel || "Smart Tech"}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold tracking-wide text-slate-400 block">Fulfillment</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Global Courier Express</span>
              </div>
            </div>
          </div>

          {product.variants.length > 1 && (
            <div className="variant-selector space-y-2">
              <label className="text-xs font-semibold tracking-wide text-foreground">Select Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.availableForSale}
                    onClick={() => setSelected(item.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
                      selected === item.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/50 text-foreground"
                    } ${!item.availableForSale ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions flex items-center gap-4">
            <div className="quantity-control flex items-center border border-border rounded-lg px-3 py-2">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="p-1 hover:opacity-70">
                <Minus size={14} />
              </button>
              <span className="px-4 font-medium text-sm">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity" className="p-1 hover:opacity-70">
                <Plus size={14} />
              </button>
            </div>
            <button className="button button-brass flex-1 py-3" type="button" onClick={add} disabled={!variant?.availableForSale}>
              {variant?.availableForSale ? "Add to Shopping Bag" : "Sold Out"}
            </button>
          </div>
          <p className="detail-note text-xs text-muted-foreground border-t border-border/50 pt-4">
            Worldwide global delivery. Fast dispatch and direct secure checkout powered by Shopify Storefront API.
          </p>
        </div>
      </div>
    </section>
    </>
  );
}
