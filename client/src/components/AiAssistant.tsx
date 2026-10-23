import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, Send, Bot, User, Sparkles, Loader2, Minus, Maximize2, ShoppingBag, ArrowUpRight, Bookmark, ListChecks, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useCart } from "@/contexts/CartContext";
import { getAdminAuthHeaders } from "@/lib/firebase";
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

interface SavedCariChat { id: string; title: string; savedAt: string; messages: Message[]; }

interface ShoppingListItem {
  id: string;
  handle: string;
  name: string;
  price: string;
  image?: string;
  addedAt: string;
}

const DEFAULT_SUGGESTIONS = [
  "Recommend top Smart Home devices",
  "Show Workspace Productivity gadgets",
  "How do I track my order?",
  "Tell me about Nexus Store"
];

const SHOPPING_SUGGESTIONS = [
  "Smart lighting & ambient items",
  "Best ergonomic desk setups",
  "How do I place an order?",
  "Track an existing purchase"
];

const STORE_SUGGESTIONS = [
  "Where can I track my order?",
  "Browse Smart Home collection",
  "Browse Workspace collection",
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
  const [adminEmails, setAdminEmails] = useState<string[] | null>(null);
  const isAdminRoute = location.startsWith("/admin");
  useEffect(() => {
    const openCari = () => setIsOpen(true);
    window.addEventListener("nexus-open-cari", openCari);
    return () => window.removeEventListener("nexus-open-cari", openCari);
  }, []);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "list" | "chats">("chat");
  const [savedChats, setSavedChats] = useState<SavedCariChat[]>(() => {
    try { return JSON.parse(localStorage.getItem("nexus_cari_saved_chats_v1") || "[]"); } catch { return []; }
  });

  // Draggable button state
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean }>({ startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const onDragStart = useCallback((clientX: number, clientY: number) => {
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      startX: clientX,
      startY: clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    };
  }, []);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;
    const newX = dragState.current.origX + dx;
    const newY = dragState.current.origY + dy;
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;
    setBtnPos({ x: Math.max(0, Math.min(maxX, newX)), y: Math.max(0, Math.min(maxY, newY)) });
  }, []);

  const onDragEnd = useCallback(() => {
    document.removeEventListener("mousemove", onMouseMoveRef.current!);
    document.removeEventListener("mouseup", onMouseUpRef.current!);
    document.removeEventListener("touchmove", onTouchMoveRef.current!);
    document.removeEventListener("touchend", onTouchEndRef.current!);
    if (dragState.current.moved) {
      // Open was prevented during drag
    }
  }, []);

  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  const onMouseUpRef = useRef<() => void>(() => {});
  const onTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  const onTouchEndRef = useRef<() => void>(() => {});

  useEffect(() => {
    onMouseMoveRef.current = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
    onMouseUpRef.current = () => onDragEnd();
    onTouchMoveRef.current = (e: TouchEvent) => { if (e.touches[0]) onDragMove(e.touches[0].clientX, e.touches[0].clientY); };
    onTouchEndRef.current = () => onDragEnd();
  }, [onDragMove, onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
    document.addEventListener("mousemove", onMouseMoveRef.current!);
    document.addEventListener("mouseup", onMouseUpRef.current!);
  }, [onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    document.addEventListener("touchmove", onTouchMoveRef.current!, { passive: false });
    document.addEventListener("touchend", onTouchEndRef.current!);
  }, [onDragStart]);

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_cari_shopping_list_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("nexus_cari_shopping_list_v1", JSON.stringify(shoppingList));
    } catch {}
  }, [shoppingList]);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_cari_chat_history_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch {}
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Cari, your Shopping Assistant at Nexus. I'm here to help you discover our smart home automation devices and workspace productivity gadgets. How can I help today?",
        timestamp: new Date(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("nexus_cari_chat_history_v1", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("nexus_cari_saved_chats_v1", JSON.stringify(savedChats)); } catch {}
  }, [savedChats]);

  const addToShoppingList = (item: { handle: string; name: string; price: string; image?: string }) => {
    setShoppingList((prev) => {
      if (prev.some((p) => p.handle === item.handle)) {
        toast.info(`${item.name} is already in your Cari Shopping List`);
        return prev;
      }
      toast.success(`Added ${item.name} to Cari Shopping List`);
      return [
        ...prev,
        {
          id: Date.now().toString(),
          handle: item.handle,
          name: item.name,
          price: item.price,
          image: item.image,
          addedAt: new Date().toLocaleDateString(),
        },
      ];
    });
  };

  const removeFromShoppingList = (handle: string) => {
    setShoppingList((prev) => prev.filter((item) => item.handle !== handle));
    toast.success("Removed item from Shopping List");
  };

  const loadCustomerEmails = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      if (!headers.Authorization) throw new Error("Sign in with an authorized Firebase admin account to access customer emails.");
      const response = await fetch("/api/admin/cari/user-emails", { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Customer email access was denied.");
      const emailList = (result.users as Array<{ email: string; displayName: string }>).map((user) =>
        user.displayName ? `${user.displayName} — ${user.email}` : user.email,
      );
      setAdminEmails(emailList);
      setActiveTab("chat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load customer emails.");
    }
  };

  const saveCurrentChat = () => {
    if (messages.filter((message) => message.role === "user").length === 0) { toast.info("Start a conversation before saving it."); return; }
    const title = messages.find((message) => message.role === "user")?.content.slice(0, 48) || "Shopping chat";
    setSavedChats((previous) => [{ id: Date.now().toString(), title, savedAt: new Date().toISOString(), messages }, ...previous]);
    setActiveTab("chats");
    toast.success("Chat saved.");
  };
  const startNewChat = () => {
    const welcome: Message = { id: `welcome-${Date.now()}`, role: "assistant", content: "Hi, I'm Cari. Tell me what you're shopping for, and I'll help you find a good match from the live Nexus catalogue.", timestamp: new Date() };
    setMessages([welcome]);
    setActiveTab("chat");
  };

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
    if (isOpen && !isMinimized && activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, activeTab]);

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
      {!isOpen && !isAdminRoute && (
        <button
          ref={dragRef}
          onClick={(e) => {
            if (!dragState.current.moved) setIsOpen(true);
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="ai-assistant-trigger-btn"
          aria-label="Ask Cari AI Shopping Assistant"
          style={btnPos ? { position: "fixed", left: btnPos.x, top: btnPos.y, right: "auto", bottom: "auto" } : { position: "fixed", right: 24, bottom: 24, left: "auto", top: "auto" }}
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
            <div className="ai-header-controls flex items-center gap-1">
              {isAdminRoute && <button type="button" onClick={loadCustomerEmails} className="ai-icon-btn text-xs" title="View Firebase customer emails (admin only)" aria-label="View Firebase customer emails">Emails</button>}
              <button
                type="button"
                onClick={saveCurrentChat}
                className="ai-icon-btn text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                title="Save this chat"
                aria-label="Save this chat"
              >
                <Bookmark size={16} />
              </button>
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
              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-1.5 text-xs font-medium justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeTab === "chat"
                        ? "bg-amber-500 text-white font-semibold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      activeTab === "list"
                        ? "bg-amber-500 text-white font-semibold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <ListChecks size={13} />
                    Shopping List ({shoppingList.length})
                  </button>
                  <button type="button" onClick={() => setActiveTab("chats")} className={`px-2.5 py-1 rounded-md text-xs ${activeTab === "chats" ? "bg-amber-500 text-white" : "text-slate-600"}`}>Chats ({savedChats.length})</button>
                </div>
                <button type="button" onClick={saveCurrentChat} className="text-[11px] text-amber-700 font-semibold hover:underline flex items-center gap-1"><Bookmark size={12} /> Save</button>
              </div>

              {isAdminRoute && adminEmails !== null && (
                <div className="max-h-36 overflow-y-auto border-b border-slate-200 bg-amber-50 p-2 text-[11px] text-slate-800">
                  <div className="mb-1 flex items-center justify-between font-semibold"><span>Firebase emails ({adminEmails.length})</span><button type="button" onClick={() => setAdminEmails(null)} aria-label="Hide customer emails">Hide</button></div>
                  {adminEmails.length ? adminEmails.map((email) => <div key={email}>{email}</div>) : <div>No Firebase customer accounts found.</div>}
                </div>
              )}
              {activeTab === "chats" ? (
                <div className="ai-assistant-messages flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between"><strong className="text-sm">Recent chats</strong><button type="button" onClick={startNewChat} className="text-xs text-amber-700">New chat</button></div>
                  {savedChats.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">Saved chats will appear here.</p> : savedChats.map((chat) => <div key={chat.id} className="flex items-center gap-2 rounded border border-slate-200 p-2"><button type="button" className="flex-1 truncate text-left text-xs" onClick={() => { setMessages(chat.messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }))); setActiveTab("chat"); }}><strong className="block truncate">{chat.title}</strong><span className="text-slate-500">{new Date(chat.savedAt).toLocaleString()}</span></button><button type="button" onClick={() => setSavedChats((previous) => previous.filter((item) => item.id !== chat.id))} className="text-rose-500" aria-label="Delete saved chat"><Trash2 size={14} /></button></div>)}
                </div>
              ) : activeTab === "list" ? (
                /* Shopping List View */
                <div className="ai-assistant-messages flex flex-col gap-3 p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks size={14} className="text-amber-500" /> Saved Shopping List
                    </span>
                    {shoppingList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShoppingList([]);
                          toast.success("Shopping list cleared");
                        }}
                        className="text-[11px] text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                      >
                        <Trash2 size={12} /> Clear all
                      </button>
                    )}
                  </div>

                  {shoppingList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <ListChecks size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                      <p>Your Cari Shopping List is empty.</p>
                      <p className="text-[11px] text-slate-400">Ask Cari for product recommendations or add items directly from chat!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {shoppingList.map((item) => {
                        const matchedProd = products.find((p) => p.handle === item.handle) || FALLBACK_PRODUCTS.find((p) => p.handle === item.handle);
                        const imgUrl = item.image || matchedProd?.image?.url || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80";
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <img src={imgUrl} alt={item.name} className="w-12 h-12 object-cover rounded-md" />
                            <div className="flex-1 min-w-0">
                              <strong className="block text-xs font-semibold truncate text-slate-900 dark:text-slate-100">{item.name}</strong>
                              <span className="text-xs text-amber-600 font-bold">{item.price}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAddToCart({ handle: item.handle, name: item.name })}
                                className="p-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 font-medium text-xs flex items-center gap-1"
                                title="Add to bag"
                              >
                                <ShoppingBag size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromShoppingList(item.handle)}
                                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Chat Messages Body */
                <>
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
                                              <button
                                                type="button"
                                                onClick={() => addToShoppingList({ handle: rec.handle, name: rec.name, price: rec.price, image: imgUrl })}
                                                className="p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400"
                                                title="Save to Cari Shopping List"
                                              >
                                                <Bookmark size={14} />
                                              </button>
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
                      placeholder="Ask Cari about Smart Home or Workspace gadgets..."
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
