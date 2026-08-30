import { Link } from "wouter";
import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Product } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const variant = product.variants.find((item) => item.availableForSale) ?? product.variants[0];
  const handleAdd = async () => { await addItem(product, variant?.id); toast("Added to your bag", { description: product.name }); };
  const image = product.image ?? product.images[0];
  return <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
    <div className="product-image-wrap"><Link href={`/products/${product.handle}`} aria-label={`View ${product.name}`}><img src={image?.url ?? "/logo.png"} alt={image?.altText ?? product.name} className="product-image" loading="lazy" /></Link>
      {product.compareAtPrice && <span className="product-tag">Sale</span>}
      <button className="quick-add" type="button" onClick={handleAdd} disabled={!product.availableForSale} aria-label={`Add ${product.name} to bag`}><Plus size={17} strokeWidth={1.5} /></button>
    </div>
    <div className="product-card-body"><div className="product-card-meta"><span>{product.categoryLabel}</span><span>{product.availableForSale ? "In stock" : "Sold out"}</span></div>
      <div className="product-title-row"><div><Link href={`/products/${product.handle}`}><h3>{product.name}</h3></Link><p>{product.description || "A useful everyday find from Liverton."}</p></div><strong>{formatPrice(product.price)}</strong></div>
      {!compact && <button type="button" className="card-add" onClick={handleAdd} disabled={!product.availableForSale}>{product.availableForSale ? <>Add to Bag <ArrowUpRight size={14} /></> : "Sold out"}</button>}
    </div>
  </article>;
}

export function CategoryPills({ active, onChange, categories = [] }: { active: string; onChange: (value: string) => void; categories?: { handle: string; title: string }[] }) {
  return <div className="category-pills" role="tablist" aria-label="Filter collections"><button className={active === "all" ? "is-active" : ""} type="button" role="tab" aria-selected={active === "all"} onClick={() => onChange("all")}>All products</button>{categories.map((category) => <button key={category.handle} className={active === category.handle ? "is-active" : ""} type="button" role="tab" aria-selected={active === category.handle} onClick={() => onChange(category.handle)}>{category.title}</button>)}</div>;
}
