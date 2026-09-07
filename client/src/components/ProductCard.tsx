import { Link } from "wouter";
import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Product } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const variant = product.variants.find((item) => item.availableForSale) ?? product.variants[0];
  const handleAdd = async () => {
    await addItem(product, variant?.id);
    toast("Added to your bag", { description: product.name });
  };
  const image = product.image ?? product.images[0];
  return (
    <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
      <div className="product-image-wrap">
        <Link href={`/products/${product.handle}`} aria-label={`View ${product.name}`}>
          <img src={image?.url ?? "/logo.png"} alt={image?.altText ?? product.name} className="product-image" loading="lazy" />
        </Link>
        {product.compareAtPrice && <span className="product-tag">Sale</span>}
        <button className="quick-add" type="button" onClick={handleAdd} disabled={!product.availableForSale} aria-label={`Add ${product.name} to bag`}>
          <Plus size={17} strokeWidth={1.5} />
        </button>
      </div>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{product.categoryLabel}</span>
          <span>{product.availableForSale ? "In stock" : "Sold out"}</span>
        </div>
        <div className="product-title-row">
          <div>
            <Link href={`/products/${product.handle}`}>
              <h3 className="text-base font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
            </Link>
          </div>
          <strong className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatPrice(product.price)}</strong>
        </div>
        <div className="product-card-actions flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <Link href={`/products/${product.handle}`} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-amber-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors inline-flex items-center gap-1">
            Description <ArrowUpRight size={12} />
          </Link>
          {!compact && (
            <button type="button" className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-amber-600 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none" onClick={handleAdd} disabled={!product.availableForSale}>
              {product.availableForSale ? "Add to Bag" : "Sold out"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CategoryPills({ active, onChange, categories = [] }: { active: string; onChange: (value: string) => void; categories?: { handle: string; title: string }[] }) {
  return (
    <div className="category-pills" role="tablist" aria-label="Filter collections">
      <button className={active === "all" ? "is-active" : ""} type="button" role="tab" aria-selected={active === "all"} onClick={() => onChange("all")}>
        All products
      </button>
      {categories.map((category) => (
        <button key={category.handle} className={active === category.handle ? "is-active" : ""} type="button" role="tab" aria-selected={active === category.handle} onClick={() => onChange(category.handle)}>
          {category.title}
        </button>
      ))}
    </div>
  );
}
