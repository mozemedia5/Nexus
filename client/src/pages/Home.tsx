import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ArrowUpRight, Cpu, Heart, PackageCheck, ShieldCheck, Zap, Megaphone, Tag, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { getCollections, getProducts, type Collection, type Product } from "@/lib/store";
import { usePersonalization } from "@/hooks/usePersonalization";
import { getActiveCampaigns } from "@/pages/Admin";

const heroBackgrounds = [
  "/nexus-hero-workspace-web.jpg",
  "/nexus-hero-home-web.jpg",
  "/nexus-hero-everyday-web.jpg",
  "/nexus-hero-reading-web.jpg",
  "/nexus-hero-kitchen-web.jpg",
];

function AutoScrollCarousel({ images }: { images: { url: string; alt: string }[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, startTimer]);

  const go = (dir: number) => {
    setCurrent((prev) => (prev + dir + images.length) % images.length);
    startTimer();
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden group">
      {images.map((img, idx) => (
        <img
          key={img.url}
          src={img.url}
          alt={img.alt}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out"
          style={{ opacity: idx === current ? 1 : 0, transform: idx === current ? "scale(1)" : "scale(1.05)" }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md" aria-label="Previous image">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md" aria-label="Next image">
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <button key={idx} type="button" onClick={() => { setCurrent(idx); startTimer(); }} className={`w-2 h-2 rounded-full transition-all ${idx === current ? "bg-white w-5" : "bg-white/50"}`} aria-label={`Go to image ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % heroBackgrounds.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      getProducts({ first: 12, sortKey: "BEST_SELLING", fresh: true }),
      getProducts({ first: 8, sortKey: "CREATED_AT", fresh: true }),
      getCollections(250),
    ])
      .then(([items, newest, groups]) => {
        setProducts(items);
        setNewestProducts(newest);
        setCollections(groups);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load catalogue."));
  }, []);

  const featuredOfficeProducts = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const newArrivalProducts = useMemo(() => {
    return newestProducts.slice(0, 4);
  }, [newestProducts]);

  const activeCampaigns = useMemo(() => getActiveCampaigns(), []);

  const carouselImages = useMemo(() => {
    return products.filter((product) => product.image?.url).slice(0, 6).map((product) => ({
      url: product.image!.url,
      alt: product.name,
    }));
  }, [products]);

  return (
    <>
      <SEO
        title="Nexus — Thoughtful Products for Home & Work"
        description="Browse the live Nexus catalogue for thoughtful products across home, work, and everyday life."
        keywords="Nexus, product catalog, home, work, everyday products"
        canonicalPath="/"
      />

      {/* Hero Section */}
      <section className="nexus-home-hero">
        <div className="nexus-hero-background" aria-hidden="true">
          {heroBackgrounds.map((image, index) => (
            <img
              key={image}
              src={image}
              className="nexus-hero-backdrop-image"
              alt=""
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              style={{
                opacity: heroImageIndex === index ? 0.84 : 0,
                transform: heroImageIndex === index ? "scale(1)" : "scale(1.055)",
              }}
            />
          ))}
          <div className="nexus-hero-image-wash" />
        </div>

        <div className="nexus-hero-inner">
          <div className="nexus-hero-copy">
            <h1>
              Discover something <br className="nexus-hero-break" />
              <span>useful for your day.</span>
            </h1>
            <p>
              Explore the live Nexus catalogue for thoughtful products across home, work, and the categories you care about.
            </p>
            <div className="nexus-hero-actions">
              <Link href="/products" className="nexus-hero-shop-button">
                Shop Now <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("nexus-open-cari"))} className="nexus-hero-cari-button">
                Ask Cari
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-scrolling Product Carousel */}
      {carouselImages.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
                Nexus catalogue
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Products from the Nexus catalogue
              </h2>
            </div>
          </div>
          <AutoScrollCarousel images={carouselImages} />
        </section>
      )}

      {/* Featured Collection Grid (4-Column) */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
              Best Sellers
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Featured Products
            </h2>
          </div>
          <Link href="/products" className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white hover:text-amber-600 flex items-center gap-1 transition-colors">
            View All Catalogue <ArrowUpRight size={14} />
          </Link>
        </div>

        {error ? (
          <div className="text-center py-10 text-slate-500">
            <p>{error}</p>
          </div>
        ) : featuredOfficeProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredOfficeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-slate-500">No products are available yet.</p>
        )}
      </section>

      {/* New Arrivals */}
      {newArrivalProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
            <div>
              <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
                Just Arrived
              </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              New Arrivals
            </h2>
            </div>
            <Link href="/products" className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white hover:text-amber-600 flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {newArrivalProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Live product collections */}
      <section id="collections" className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-semibold tracking-wide text-amber-600 block mb-0.5">Product collections</span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Browse by collection</h2>
          </div>
          {collections.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.slice(0, 9).map((collection) => (
                <Link key={collection.id} href={`/products?collection=${encodeURIComponent(collection.handle)}`} className="group relative h-48 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-end p-5">
                  {collection.image?.url && <img src={collection.image.url} alt={collection.image.altText || collection.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent" />
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-sm font-bold tracking-wide text-white">{collection.title}</h3>
                    {collection.description && <p className="line-clamp-2 text-xs text-stone-200">{collection.description}</p>}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">Explore <ArrowUpRight size={13} /></span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-center text-sm text-slate-500">Live Product collections will appear here when available.</p>}
        </div>
      </section>

      {/* Smart Office Section */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
              More from Nexus
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Keep exploring
            </h2>
          </div>
          <Link href="/products" className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white hover:text-amber-600 flex items-center gap-1 transition-colors">
            View catalogue <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.slice(4, 7).map((product) => (
            <ProductCard key={`office-${product.id}`} product={product} />
          ))}
        </div>
      </section>

      {/* Support & Fulfillment FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold tracking-wide text-amber-600 block mb-0.5">
            Support &amp; Fulfillment
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-3">
          <details className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all">
            <summary className="font-semibold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center text-sm tracking-wide">
              How do I track my order?
              <ArrowUpRight size={14} className="transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Track your order status in real time by visiting our <Link href="/track-order" className="underline font-bold text-slate-900 dark:text-white">Order Tracking page</Link> using your order ID and verification contact.
            </p>
          </details>
          <details className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all">
            <summary className="font-semibold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center text-sm tracking-wide">
              What products does Nexus specialize in?
              <ArrowUpRight size={14} className="transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
Our catalog features products and collections currently available from Nexus. Browse the live catalogue to see what is available today.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
