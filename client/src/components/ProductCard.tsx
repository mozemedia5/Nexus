/* LongTail Parisian Atelier Editorial — product cards read like catalogue plates, with useful touch targets. */

import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Product } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(product.id);
    toast("Added to your bag", { description: product.name });
  };

  return (
    <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
      <div className="product-image-wrap">
        <img src={product.image} alt={product.alt} className="product-image" />
        {product.tag && <span className="product-tag">{product.tag}</span>}
        <button className="quick-add" type="button" onClick={handleAdd} aria-label={`Add ${product.name} to bag`}><Plus size={17} strokeWidth={1.5} /></button>
      </div>
      <div className="product-card-body">
        <div className="product-card-meta"><span>{product.categoryLabel}</span><span>{product.material}</span></div>
        <div className="product-title-row">
          <div><h3>{product.name}</h3><p>{product.description}</p></div>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        {!compact && <button type="button" className="card-add" onClick={handleAdd}>Add to Bag <ArrowUpRight size={14} /></button>}
      </div>
    </article>
  );
}

export function CategoryPills({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  const categories = [
    { value: "all", label: "All Collections" },
    { value: "beds", label: "Cozy Beds" },
    { value: "walks", label: "Daily Walks" },
    { value: "treats", label: "Gourmet Treats" },
  ];
  return (
    <div className="category-pills" role="tablist" aria-label="Filter collections">
      {categories.map((category) => (
        <button key={category.value} className={active === category.value ? "is-active" : ""} type="button" role="tab" aria-selected={active === category.value} onClick={() => onChange(category.value)}>{category.label}</button>
      ))}
    </div>
  );
}
