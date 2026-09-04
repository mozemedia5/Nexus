import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Send, Bot, User, Sparkles, Loader2, Minus, Maximize2 } from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import {
  getCollections,
  getProducts,
  shopifyConfigured,
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
  "Recommend top beauty products",
  "How fast is Kampala delivery?",
  "Show smart kitchen gadgets",
  "What is your return policy?"
];

const SHOPPING_SUGGESTIONS = [
  "Best deals under 50,000 UGX",
  "What are trending items today?",
  "Recommend home and lifestyle items",
  "How do I place an order?"
];

const STORE_SUGGESTIONS = [
  "How do I place an order?",
  "Where can I browse the catalogue?",
  "What collection should I start with?",
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Cari, your Shopping Assistant at Nexus Store. I’m here to help you discover smart finds. How can I help today?",
      timestamp: new Date(),
    },
  ]);
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
    if (lastUserMsg.includes("order") || lastUserMsg.includes("catalogue") || lastUserMsg.includes("collection")) {
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
        // The assistant can still answer general store questions without a live catalogue snapshot.
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
        content: err.message || "I encountered an error connecting to Cari AI. Please make sure the API key is configured or try again later.",
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
                <span className="ai-byline">By Hanna AI</span>
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
                  <div className="ai-catalog-status">Loading the live Nexus catalogue…</div>
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
                        <div className="ai-message-content ai-markdown">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
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

              {/* Suggestions with Super-Class Staggered Glide */}
              {!loading && (
                <div className="ai-suggestions-container">
                  <div className="ai-suggestions-header">
                    <Sparkles className="ai-suggestions-sparkle" size={13} />
                    <p className="ai-suggestions-label">Suggested prompts</p>
                  </div>
                  <div className="ai-suggestions-list">
                    {activeSuggestions.slice(0, 4).map((sug, idx) => (
                      <button
                        key={`${sug}-${idx}`}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className={`ai-suggestion-chip premium-card premium-glide delay-${idx + 1}`}
                      >
                        <span className="ai-suggestion-text">{sug}</span>
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
                  placeholder="Ask Cari about products or collections..."
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
