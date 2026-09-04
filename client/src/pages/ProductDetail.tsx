import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { getProduct, formatPrice, shopifyConfigured, type Product } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    if (!params?.handle || !shopifyConfigured) return;
    getProduct(params.handle)
      .then((item) => {
        setProduct(item);
        setSelected(item?.variants.find((variant) => variant.availableForSale)?.id ?? item?.variants[0]?.id ?? "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load this product."));
  }, [params?.handle]);

  if (!shopifyConfigured)
    return (
      <div className="empty-state page-pad">
        <h2>Shopify Storefront API connection required</h2>
        <p>Add your VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN variables in environment settings to load live product details.</p>
      </div>
    );

  if (error)
    return (
      <div className="empty-state page-pad">
        <h2>Product unavailable</h2>
        <p>{error}</p>
      </div>
    );

  if (!product)
    return (
      <div className="empty-state page-pad">
        <h2>Loading product…</h2>
      </div>
    );

  const image = product.images[0] ?? product.image;
  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];

  const add = async () => {
    await addItem(product, variant?.id, quantity);
    toast("Added to your bag", { description: product.name });
  };

  return (
    <section className="product-detail section-pad">
      <Link href="/products" className="back-link">
        <ArrowLeft size={15} /> Back to shop
      </Link>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <img src={image?.url ?? "/logo.png"} alt={image?.altText ?? product.name} />
          <div className="product-thumbs">
            {product.images.map((item) => (
              <img key={item.url} src={item.url} alt="" />
            ))}
          </div>
        </div>
        <div className="product-info">
          <span className="eyebrow">{product.categoryLabel}</span>
          <h1>{product.name}</h1>
          <div className="detail-price">
            <strong>{formatPrice(variant?.price ?? product.price)}</strong>
            {product.compareAtPrice && <del>{formatPrice(product.compareAtPrice)}</del>}
          </div>
          <p className="detail-description">{product.description || "A smart home or beauty & wellness find curated by Nexus A Liverton Store."}</p>
          {product.variants.length > 1 && (
            <label className="variant-label">
              Choose an option
              <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                {product.variants.map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.availableForSale}>
                    {item.title}
                    {!item.availableForSale ? " — Sold out" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="detail-actions">
            <div className="quantity-control">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">
                <Plus size={14} />
              </button>
            </div>
            <button className="button button-brass" type="button" onClick={add} disabled={!variant?.availableForSale}>
              {variant?.availableForSale ? "Add to bag" : "Sold out"}
            </button>
          </div>
          <p className="detail-note">Secure checkout is handled by Shopify. Delivery, tracking, and returns follow active Nexus A Liverton Store policies.</p>
        </div>
      </div>
    </section>
  );
}
