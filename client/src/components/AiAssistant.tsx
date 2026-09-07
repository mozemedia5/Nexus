import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Send, Bot, User, Sparkles, Loader2, Minus, Maximize2, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { useCart } from "@/contexts/CartContext";
import {
  getCollections,
  getProducts,
  shopifyConfigured,
  FALLBACK_PRODUCTS,
  type Collection,
  type Product,
} from "@/lib/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const DEFAULT_SUGGESTIONS = [
  "Recommend top Smart Home devices",
  "Show Beauty & Wellness essentials",
  "How do I track my order?",
  "Tell me about Nexus A Liverton Store"
];

const SHOPPING_SUGGESTIONS = [
  "Smart lighting & automation items",
  "Trending beauty & skincare tech",
  "How do I place an order?",
  "Track an existing purchase"
];

const STORE_SUGGESTIONS = [
  "Where can I track my order?",
  "Browse Smart Home collection",
  "Browse Beauty & Wellness collection",
  "Can you help me compare products?",
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

export default function AiAssistant() {
  const [location] = useLocation();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Cari, your Shopping Assistant at Nexus A Liverton Store. I'm here to help you discover our curated Smart Home devices and Beauty & Wellness essentials. How can I help today?",
      timestamp: new Date(),
    },
  ]);

  const parseRecommendations = (content: string) => {
    try {
      const match = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed.recommendations)) {
          const cleanText = content.replace(/```json\s*\{[\s\S]*?\}\s*```/, "").trim();
          return { cleanText, recommendations: parsed.recommendations };
        }
      }
    } catch {}
    return { cleanText: content, recommendations: [] };
  };

  const handleAddToCart = async (rec: { handle: string; name: string }) => {
    const liveProd = products.find((p) => p.handle === rec.handle) || FALLBACK_PRODUCTS.find((p) => p.handle === rec.handle);
    if (liveProd) {
      await addItem(liveProd);
    }
  };
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const catalog = useMemo(
    () => assistantCatalog(products, collections, location),
    [products, collections, location],
  );

  const activeSuggestions = useMemo(() => {
    if (messages.length <= 1) return DEFAULT_SUGGESTIONS;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() || "";
    if (lastUserMsg.includes("order") || lastUserMsg.includes("track") || lastUserMsg.includes("collection")) {
      return STORE_SUGGESTIONS;
    }
    if (lastUserMsg.includes("product") || lastUserMsg.includes("recommend") || lastUserMsg.includes("compare") || lastUserMsg.includes("available")) {
      return SHOPPING_SUGGESTIONS;
    }
    return DEFAULT_SUGGESTIONS;
  }, [messages]);

  useEffect(() => {
    if (!isOpen || catalogLoaded || catalogLoading) return;

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
        // General support available without live snapshot
      })
      .finally(() => {
        setCatalogLoaded(true);
        setCatalogLoading(false);
      });
  }, [isOpen, catalogLoaded, catalogLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, catalog }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to reach Cari AI Assistant server.");
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message || "I encountered an error connecting to Cari AI. Please check server configuration.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-wrapper">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-assistant-trigger-btn"
          aria-label="Ask Cari AI Shopping Assistant"
        >
          <div className="ai-trigger-icon-wrap">
            <Sparkles className="ai-sparkle-icon" size={20} />
          </div>
          <span className="ai-trigger-text">
            Ask Cari
          </span>
        </button>
      )}

      {isOpen && (
        <div className={`ai-assistant-card ${isMinimized ? "is-minimized" : ""}`}>
          {/* Header */}
          <div className="ai-assistant-header">
            <div className="ai-assistant-title">
              <div className="ai-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="ai-name">
                  Cari <span className="ai-subtitle">Shopping Assistant</span>
                </h3>
                <span className="ai-byline">Nexus A Liverton Store</span>
              </div>
            </div>
            <div className="ai-header-controls">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="ai-icon-btn"
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ai-icon-btn"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="ai-assistant-messages">
                {catalogLoading && (
                  <div className="ai-catalog-status">Loading live Nexus catalogue…</div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`ai-message-row ${msg.role === "user" ? "user-row" : "assistant-row"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="ai-msg-avatar">
                        <Bot size={15} />
                      </div>
                    )}
                    <div className={`ai-message-bubble ${msg.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
                      {msg.role === "assistant" ? (
                        (() => {
                          const { cleanText, recommendations } = parseRecommendations(msg.content);
                          return (
                            <div className="ai-message-content ai-markdown">
                              <Streamdown>{cleanText}</Streamdown>

                              {recommendations.length > 0 && (
                                <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles size={11} /> Recommended Items
                                  </span>
                                  {recommendations.map((rec: any, idx: number) => {
                                    const matchedProd = products.find((p) => p.handle === rec.handle) || FALLBACK_PRODUCTS.find((p) => p.handle === rec.handle);
                                    const imgUrl = rec.image || matchedProd?.image?.url || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80";
                                    return (
                                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <img src={imgUrl} alt={rec.name} className="w-12 h-12 object-cover rounded-md" />
                                        <div className="flex-1 min-w-0">
                                          <strong className="block text-xs font-semibold truncate text-slate-900 dark:text-slate-100">{rec.name}</strong>
                                          <span className="text-xs text-amber-600 font-bold">{rec.price}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Link href={`/products/${rec.handle}`} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300" title="View details">
                                            <ArrowUpRight size={14} />
                                          </Link>
                                          <button type="button" onClick={() => handleAddToCart(rec)} className="p-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 font-medium text-xs flex items-center gap-1" title="Add to bag">
                                            <ShoppingBag size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <p className="ai-message-content">{msg.content}</p>
                      )}
                      <span className="ai-message-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {msg.role === "user" && (
                      <div className="ai-msg-avatar user-msg-avatar">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="ai-message-row assistant-row">
                    <div className="ai-msg-avatar">
                      <Bot size={15} />
                    </div>
                    <div className="ai-message-bubble assistant-bubble ai-loading-bubble">
                      <Loader2 className="animate-spin" size={16} />
                      <span>Cari is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {!loading && activeSuggestions.length > 0 && (
                <div className="ai-suggestions-container">
                  <div className="ai-suggestions-track">
                    {activeSuggestions.slice(0, 4).map((sug, idx) => (
                      <button
                        key={`${sug}-${idx}`}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className="ai-suggestion-pill"
                      >
                        <Sparkles size={11} className="ai-pill-icon" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="ai-assistant-input-form"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Cari about Smart Home or Beauty products..."
                  className="ai-assistant-input"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="ai-assistant-send-btn"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
