import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
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
  const [error, setError] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    if (!params?.handle) return;
    getProduct(params.handle)
      .then((item) => {
        setProduct(item);
        setSelected(item?.variants.find((variant) => variant.availableForSale)?.id ?? item?.variants[0]?.id ?? "");
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
        <h2>Loading product details…</h2>
      </div>
    );

  const images = product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
  const currentImage = images[activeImageIndex] ?? product.image;
  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];

  const add = async () => {
    await addItem(product, variant?.id, quantity);
    toast.success("Added to your shopping bag", { description: `${product.name} (x${quantity})` });
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
          <div className="main-image-frame overflow-hidden rounded-xl bg-neutral-100 border border-border/50 aspect-square flex items-center justify-center relative">
            <img
              src={currentImage?.url ?? "/logo.png"}
              alt={currentImage?.altText ?? product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
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
        <div className="product-info flex flex-col gap-6">
          <div>
            <span className="eyebrow uppercase text-xs tracking-wider text-muted-foreground">{product.categoryLabel || "Nexus Collection"}</span>
            <h1 className="text-3xl font-serif font-medium mt-1 text-foreground">{product.name}</h1>
          </div>
          <div className="detail-price flex items-baseline gap-3 text-2xl font-medium">
            <strong>{formatPrice(variant?.price ?? product.price)}</strong>
            {product.compareAtPrice && <del className="text-base text-muted-foreground font-normal">{formatPrice(product.compareAtPrice)}</del>}
          </div>
          <p className="detail-description text-muted-foreground leading-relaxed text-sm">{product.description || "A smart home or workspace productivity gadget curated by Nexus."}</p>

          {product.variants.length > 1 && (
            <div className="variant-selector space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Select Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.availableForSale}
                    onClick={() => setSelected(item.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-md border transition-all ${
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
            <div className="quantity-control flex items-center border border-border rounded-md px-3 py-2">
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
