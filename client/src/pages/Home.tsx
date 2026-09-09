import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ArrowUpRight, Sparkles, Cpu, Heart, PackageCheck, ShieldCheck, Zap, Megaphone, Tag, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { getCollections, getProducts, type Collection, type Product } from "@/lib/store";
import { usePersonalization } from "@/hooks/usePersonalization";
import { getActiveCampaigns } from "@/pages/Admin";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProducts({ first: 12, sortKey: "BEST_SELLING" }), getCollections(8)])
      .then(([items, groups]) => {
        setProducts(items);
        setCollections(groups);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load catalogue."));
  }, []);

  const featuredOfficeProducts = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const newArrivalProducts = useMemo(() => {
    return products.slice(4, 8);
  }, [products]);

  const activeCampaigns = useMemo(() => getActiveCampaigns(), []);

  const carouselImages = useMemo(() => {
    if (products.length === 0) return [
      { url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80", alt: "Smart workspace setup" },
      { url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80", alt: "Smart home automation" },
      { url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80", alt: "Tech accessories" },
    ];
    return products.slice(0, 6).map((p) => ({
      url: p.image?.url || "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
      alt: p.name,
    }));
  }, [products]);

  return (
    <>
      <SEO
        title="Nexus — Smart Home & Workspace Gadgets"
        description="Redefine your desk and living environment with Nexus: Premium smart home automation, ergonomic desk lighting, docking stations, and productivity gadgets."
        keywords="Nexus, Smart Home Gadgets, Workspace Productivity, Smart Office Upgrades, Tech Accessories"
        canonicalPath="/"
      />

      {/* Hero Section */}
      <section className="relative w-full bg-slate-950 text-white min-h-[380px] md:min-h-[440px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1800&q=80"
            alt="Ergonomic Desk & Smart Lighting Setup"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 backdrop-blur border border-white/20 rounded-full text-[10px] font-semibold tracking-wide text-slate-200">
              <Sparkles size={12} className="text-amber-400" /> Elevated Productivity &amp; Automation
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
              Precision Gadgets for <br />
              <span className="text-amber-400">Smart Office &amp; Home</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed font-normal">
              Engineered for seamless productivity, ergonomic comfort, and intelligent home control. Upgrade your workstation with next-generation ambient lighting, smart docks, and connected sensors.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/products?collection=workspace-productivity"
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-md"
              >
                Shop Now <ArrowUpRight size={14} />
              </Link>
              <Link
                href="/products?collection=smart-home"
                className="px-5 py-3 bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Smart Home Setup
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-scrolling Product Carousel */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
              Nexus catalogue
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Smart Home &amp; Office Electronics
            </h2>
          </div>
        </div>
        <AutoScrollCarousel images={carouselImages} />
      </section>

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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredOfficeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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

      {/* Categorization Visual Collections Section */}
      <section className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold tracking-wide text-amber-600 block mb-0.5">
              Curated Collections
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered For Modern Work &amp; Living
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Smart Home Automation */}
            <Link
              href="/products?collection=smart-home"
              className="group relative h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-5 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80"
                alt="Smart Home Automation"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-1.5">
                <span className="text-[10px] font-semibold tracking-wide text-amber-400">
                  Collection 01
                </span>
                <h3 className="text-sm font-bold tracking-wide">
                  Smart Home Automation
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Ambient lighting, environmental climate hubs, and automated security controls.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 pt-1 tracking-wide">
                  Explore Hubs <ArrowUpRight size={13} />
                </span>
              </div>
            </Link>

            {/* 2. Workspace Productivity */}
            <Link
              href="/products?collection=workspace-productivity"
              className="group relative h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-5 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80"
                alt="Workspace Productivity"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-1.5">
                <span className="text-[10px] font-semibold tracking-wide text-amber-400">
                  Collection 02
                </span>
                <h3 className="text-sm font-bold tracking-wide">
                  Workspace Productivity
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Monitor light bars, high-speed Thunderbolt docks, and focus desk tools.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 pt-1 tracking-wide">
                  Upgrade Desk <ArrowUpRight size={13} />
                </span>
              </div>
            </Link>

            {/* 3. Tech Accessories */}
            <Link
              href="/products?collection=tech-accessories"
              className="group relative h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-5 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
                alt="Tech Accessories"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-1.5">
                <span className="text-[10px] font-semibold tracking-wide text-amber-400">
                  Collection 03
                </span>
                <h3 className="text-sm font-bold tracking-wide">
                  Tech Accessories
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Magnetic wireless chargers, studio active noise canceling headphones, and stands.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 pt-1 tracking-wide">
                  View Accessories <ArrowUpRight size={13} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Smart Office Section */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 block mb-0.5">
              Smart Office
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Office Essentials
            </h2>
          </div>
          <Link href="/products?collection=workspace-productivity" className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white hover:text-amber-600 flex items-center gap-1 transition-colors">
            Shop Office <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.slice(0, 3).map((product) => (
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
              Nexus specializes exclusively in smart home automation devices, ergonomic desk lighting, high-speed workstation docks, and premium tech accessories.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
