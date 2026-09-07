import { useEffect, useState, useMemo } from "react";
import { ArrowUpRight, Sparkles, Cpu, Heart, PackageCheck, ShieldCheck, Zap, Megaphone, Tag } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { getCollections, getProducts, type Collection, type Product } from "@/lib/store";
import { usePersonalization } from "@/hooks/usePersonalization";
import { getActiveCampaigns } from "@/pages/Admin";

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

  const activeCampaigns = useMemo(() => getActiveCampaigns(), []);

  return (
    <>
      <SEO
        title="Nexus — Smart Home & Workspace Gadgets"
        description="Redefine your desk and living environment with Nexus: Premium smart home automation, ergonomic desk lighting, docking stations, and productivity gadgets."
        keywords="Nexus, Smart Home Gadgets, Workspace Productivity, Smart Office Upgrades, Tech Accessories"
        canonicalPath="/"
      />

      {/* Hero Section */}
      <section className="relative w-full bg-slate-950 text-white min-h-[580px] md:min-h-[640px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1800&q=80"
            alt="Ergonomic Desk & Smart Lighting Setup"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur border border-white/20 rounded-full text-xs font-semibold tracking-wider text-slate-200 uppercase">
              <Sparkles size={13} className="text-amber-400" /> Elevated Productivity &amp; Automation
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase leading-[1.08]">
              Precision Gadgets for <br />
              <span className="text-amber-400">Smart Office &amp; Home</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
              Engineered for seamless productivity, ergonomic comfort, and intelligent home control. Upgrade your workstation with next-generation ambient lighting, smart docks, and connected sensors.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/products?collection=workspace-productivity"
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-transform hover:-translate-y-0.5 shadow-md"
              >
                Shop Now <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/products?collection=smart-home"
                className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-colors"
              >
                Smart Home Setup
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection Grid (4-Column) */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
              Smart Office Upgrades
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              Best Sellers &amp; New Arrivals
            </h2>
          </div>
          <Link href="/products" className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white hover:text-amber-600 flex items-center gap-1 transition-colors">
            View All Catalogue <ArrowUpRight size={15} />
          </Link>
        </div>

        {error ? (
          <div className="text-center py-12 text-slate-500">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredOfficeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Categorization Visual Collections Section */}
      <section className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 block mb-1">
              Curated Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              Engineered For Modern Work &amp; Living
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Smart Home Automation */}
            <Link
              href="/products?collection=smart-home"
              className="group relative h-96 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-8 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80"
                alt="Smart Home Automation"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Collection 01
                </span>
                <h3 className="text-xl font-bold uppercase tracking-wide">
                  Smart Home Automation
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Ambient lighting, environmental climate hubs, and automated security controls.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-2 uppercase tracking-wider">
                  Explore Hubs <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>

            {/* 2. Workspace Productivity */}
            <Link
              href="/products?collection=workspace-productivity"
              className="group relative h-96 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-8 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80"
                alt="Workspace Productivity"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Collection 02
                </span>
                <h3 className="text-xl font-bold uppercase tracking-wide">
                  Workspace Productivity
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Monitor light bars, high-speed Thunderbolt docks, and focus desk tools.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-2 uppercase tracking-wider">
                  Upgrade Desk <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>

            {/* 3. Tech Accessories */}
            <Link
              href="/products?collection=tech-accessories"
              className="group relative h-96 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl flex flex-col justify-end p-8 text-white"
            >
              <img
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
                alt="Tech Accessories"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Collection 03
                </span>
                <h3 className="text-xl font-bold uppercase tracking-wide">
                  Tech Accessories
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Magnetic wireless chargers, studio active noise canceling headphones, and stands.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-2 uppercase tracking-wider">
                  View Accessories <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Support & Fulfillment FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 block mb-1">
            Support &amp; Fulfillment
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-4">
          <details className="group bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 transition-all">
            <summary className="font-semibold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center text-sm uppercase tracking-wider">
              How do I track my order?
              <ArrowUpRight size={16} className="transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Track your order status in real time by visiting our <Link href="/track-order" className="underline font-bold text-slate-900 dark:text-white">Order Tracking page</Link> using your order ID and verification contact.
            </p>
          </details>
          <details className="group bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 transition-all">
            <summary className="font-semibold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center text-sm uppercase tracking-wider">
              What products does Nexus specialize in?
              <ArrowUpRight size={16} className="transition-transform group-open:rotate-90" />
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
