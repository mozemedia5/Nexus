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
  const mainImage = product.image ?? product.images[0];
  const secondaryImage = product.images.length > 1 ? product.images[1] : null;

  return (
    <article className={`group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${compact ? "p-2" : ""}`}>
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
        <Link href={`/products/${product.handle}`} className="w-full h-full block relative" aria-label={`View ${product.name}`}>
          {/* Main Image */}
          <img
            src={mainImage?.url ?? "/logo.png"}
            alt={mainImage?.altText ?? product.name}
            className={`w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-105 ${secondaryImage ? "group-hover:opacity-0" : ""}`}
            loading="lazy"
          />
          {/* Secondary Image on Hover */}
          {secondaryImage && (
            <img
              src={secondaryImage.url}
              alt={secondaryImage.altText ?? product.name}
              className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
              loading="lazy"
            />
          )}
        </Link>
        {product.compareAtPrice && (
          <span className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider">
            Sale
          </span>
        )}
        <button
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-slate-900 hover:text-white"
          type="button"
          onClick={handleAdd}
          disabled={!product.availableForSale}
          aria-label={`Add ${product.name} to bag`}
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
            {product.categoryLabel}
          </span>
          <Link href={`/products/${product.handle}`}>
            <h3 className="text-sm font-normal text-slate-800 dark:text-slate-100 line-clamp-1 hover:text-slate-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs line-through text-slate-400">
              {formatPrice(product.compareAtPrice)}
            </span>
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
