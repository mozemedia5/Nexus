import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import {
  getCollections,
  getProducts,
  shopifyConfigured,
  type Collection,
  type Product,
} from "@/lib/store";

const STARTER_PROMPTS = [
  "Help me find the right product",
  "What is new in the store?",
  "Show me something within my budget",
];

function assistantCatalog(products: Product[], collections: Collection[], currentPath: string) {
  return {
    currentPath,
    products: products.map((product) => ({
      handle: product.handle,
      name: product.name,
      description: product.description,
      categoryLabel: product.categoryLabel,
      tags: product.tags,
      image: product.image,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      availableForSale: product.availableForSale,
      variants: product.variants.map((variant) => ({
        title: variant.title,
        availableForSale: variant.availableForSale,
        price: variant.price,
      })),
    })),
    collections: collections.map((collection) => ({
      handle: collection.handle,
      title: collection.title,
      description: collection.description,
    })),
  };
}

export default function ShoppingAssistant() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const catalog = useMemo(
    () => assistantCatalog(products, collections, location),
    [products, collections, location],
  );

  useEffect(() => {
    if (!open || catalogLoaded || catalogLoading) return;

    if (!shopifyConfigured) {
      setCatalogLoaded(true);
      return;
    }

    setCatalogLoading(true);
    Promise.all([
      getProducts({ first: 120, sortKey: "CREATED_AT" }),
      getCollections(40),
    ])
      .then(([liveProducts, liveCollections]) => {
        setProducts(liveProducts);
        setCollections(liveCollections);
      })
      .catch(() => {
        // The assistant remains available and will transparently explain that live catalogue data is unavailable.
      })
      .finally(() => {
        setCatalogLoaded(true);
        setCatalogLoading(false);
      });
  }, [open, catalogLoaded, catalogLoading]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/shopping-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, catalog }),
      });
      const payload = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || "The shopping assistant is unavailable right now.");
      }
      setMessages((current) => [...current, { role: "assistant", content: payload.reply! }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I couldn't connect right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-black/20 p-0 backdrop-blur-[2px] sm:p-5">
          <section
            aria-label="Lumi shopping assistant"
            className="flex h-[100dvh] w-full flex-col overflow-hidden border border-black/10 bg-[#f7f4ee] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-40px)] sm:w-[min(430px,calc(100vw-40px))] sm:rounded-[24px]"
          >
            <header className="flex items-center justify-between border-b border-black/10 bg-[#f7f4ee] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#1d2620] text-[#f8f4ec] shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="font-serif text-lg leading-none text-[#1d2620]">Lumi</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6e746e]">Shopping assistant · By Hanna AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Lumi shopping assistant"
                className="flex size-9 items-center justify-center rounded-full text-[#59615b] transition hover:bg-black/5 hover:text-[#1d2620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2620]/40"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="border-b border-black/5 bg-[#ece8de] px-5 py-2.5 text-[11px] tracking-wide text-[#59615b]">
              {catalogLoading
                ? "Preparing the live Nexus catalogue…"
                : catalogLoaded && shopifyConfigured
                  ? "Using live product and collection information"
                  : "Ready to help you explore Nexus Store"}
            </div>

            <AIChatBox
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              height="min(620px, calc(100dvh - 180px))"
              className="min-h-0 flex-1 rounded-none border-0 bg-[#f7f4ee] shadow-none"
              placeholder="Ask Lumi what to shop…"
              emptyStateMessage="Tell me what you’re looking for, and I’ll help you choose."
              suggestedPrompts={STARTER_PROMPTS}
            />
          </section>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Lumi shopping assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#1d2620] px-4 py-3 text-sm font-medium text-[#f8f4ec] shadow-[0_14px_35px_rgba(29,38,32,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2e3b31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2620]/50 focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-4" />
          <span>Ask Lumi</span>
          <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[#c7d0c7] sm:inline">By Hanna AI</span>
        </button>
      )}
    </>
  );
}
