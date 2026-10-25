import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, Send, User, Sparkles, Loader2, Minus, Maximize2, ShoppingCart, ArrowUpRight, Bookmark, ListChecks, Trash2, ImagePlus, Download, Maximize } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useCart } from "@/contexts/CartContext";
import { getAdminAuthHeaders } from "@/lib/firebase";
import { createCariUploadSession, uploadToCloudinary } from "@/lib/cloudinary";
import {
  getCollections,
  shopifyConfigured,
  type Collection,
  type Product,
  formatPrice,
  getAllProducts,
} from "@/lib/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
  imageNames?: string[];
  timestamp: Date;
}

interface ShoppingListItem {
  id: string;
  handle: string;
  name: string;
  price: string;
  image?: string;
  addedAt: string;
}

interface AssistantPayload {
  cleanText: string;
  recommendations: any[];
  shoppingList?: { add?: Array<{ handle?: string; name?: string; price?: string; image?: string }>; remove?: Array<{ handle?: string; name?: string }> };
}

const DEFAULT_SUGGESTIONS = [
  "Find a useful product for my home",
  "Help me choose something for work",
  "How do I track my order?",
  "Compare a couple of products for me"
];

const SHOPPING_SUGGESTIONS = [
  "Show me products for everyday use",
  "Help me compare two options",
  "How do I place an order?",
  "Track an existing purchase"
];

const STORE_SUGGESTIONS = [
  "Where can I track my order?",
  "Find an item from the live catalogue",
  "Help me compare products",
  "Can you help me choose a product?",
];

function assistantCatalog(products: Product[], collections: Collection[], currentPath: string, shoppingList: ShoppingListItem[]) {
  return {
    currentPath,
    products: products.map((product) => ({
      handle: product.handle,
      name: product.name,
      description: product.description.slice(0, 1000),
      categoryLabel: product.categoryLabel,
      tags: product.tags.slice(0, 30),
      image: product.image ? { url: product.image.url, altText: product.image.altText } : null,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      availableForSale: product.availableForSale,
      variants: product.variants.slice(0, 10).map((variant) => ({
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
    shoppingList: shoppingList.map(({ handle, name, price }) => ({ handle, name, price })),
  };
}

function parseAssistantPayload(content: string): AssistantPayload {
  try {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match?.[1]) {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed.recommendations) || parsed.shoppingList) {
        return {
          cleanText: content.replace(match[0], "").trim(),
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          shoppingList: parsed.shoppingList,
        };
      }
    }
  } catch {}
  return { cleanText: content, recommendations: [] };
}

export default function AiAssistant() {
  const [location] = useLocation();
  const { addItem, addItems } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[] | null>(null);
  const isAdminRoute = location.startsWith("/admin");
  useEffect(() => {
    if (location === "/cari") { setIsOpen(true); setIsMinimized(false); }
  }, [location]);

  useEffect(() => {
    const openCari = () => setIsOpen(true);
    const requestImageUpload = () => {
      setIsOpen(true);
      window.setTimeout(() => imageInputRef.current?.click(), 120);
    };
    window.addEventListener("nexus-open-cari", openCari);
    window.addEventListener("nexus-cari-upload-request", requestImageUpload);
    return () => {
      window.removeEventListener("nexus-open-cari", openCari);
      window.removeEventListener("nexus-cari-upload-request", requestImageUpload);
    };
  }, []);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "list">("chat");

  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem("nexus_cari_session_id") || "");
  const [cleanupToken, setCleanupToken] = useState(() => sessionStorage.getItem("nexus_cari_cleanup_token") || "");
  const [attachedImages, setAttachedImages] = useState<Array<{ url: string; name: string }>>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [newListItem, setNewListItem] = useState("");
  const [expandedImage, setExpandedImage] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

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
        content: "Hello! I'm Cari, your shopping assistant at Nexus. I can help you explore our live product selection, compare options, and narrow down choices using your preferences. What are you looking for today?",
        timestamp: new Date(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("nexus_cari_chat_history_v1", JSON.stringify(messages));
    } catch {}
  }, [messages]);


  const addToShoppingList = (item: { handle?: string; name: string; price?: string; image?: string }) => {
    const name = item.name.trim();
    if (!name) return;
    const handle = item.handle?.trim() || `custom:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    setShoppingList((prev) => {
      if (prev.some((p) => p.handle === handle || p.name.toLowerCase() === name.toLowerCase())) {
        toast.info(`${name} is already in your Cari Shopping List`);
        return prev;
      }
      toast.success(`Added ${name} to Cari Shopping List`);
      return [
        ...prev,
        {
          id: Date.now().toString(),
          handle,
          name,
          price: item.price || "",
          image: item.image,
          addedAt: new Date().toLocaleDateString(),
        },
      ];
    });
  };

  const removeFromShoppingList = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
    toast.success("Removed item from Shopping List");
  };

  const applyShoppingListChanges = (changes: AssistantPayload["shoppingList"]) => {
    if (!changes) return;
    for (const item of changes.remove ?? []) {
      setShoppingList((previous) => previous.filter((saved) =>
        !(item.handle && saved.handle === item.handle) && !(item.name && saved.name.toLowerCase() === item.name.toLowerCase()),
      ));
    }
    for (const item of changes.add ?? []) {
      if (typeof item.name === "string" && item.name.trim()) addToShoppingList({ handle: item.handle, name: item.name, price: item.price, image: item.image });
    }
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

  const handleImageFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).slice(0, Math.max(0, 4 - attachedImages.length));
    if (!selectedFiles.length) return;
    const invalid = selectedFiles.find((file) => !file.type.startsWith("image/") || file.size > 6_000_000);
    if (invalid) {
      toast.error(invalid.size > 6_000_000 ? "Each search image must be 6 MB or smaller." : "Choose an image file to search.");
      return;
    }
    setImageUploading(true);
    try {
      let activeSessionId = sessionId;
      let activeCleanupToken = cleanupToken;
      if (!activeSessionId || !activeCleanupToken) {
        const uploadSession = await createCariUploadSession();
        activeSessionId = uploadSession.sessionId;
        activeCleanupToken = uploadSession.cleanupToken;
        sessionStorage.setItem("nexus_cari_session_id", activeSessionId);
        sessionStorage.setItem("nexus_cari_cleanup_token", activeCleanupToken);
        setSessionId(activeSessionId);
        setCleanupToken(activeCleanupToken);
      }
      const uploaded: Array<{ url: string; name: string }> = [];
      for (const file of selectedFiles) {
        const result = await uploadToCloudinary(file, {
          folder: `nexus/cari-sessions/${activeSessionId}`,
          sessionId: activeSessionId,
          cleanupToken: activeCleanupToken,
        });
        uploaded.push({ url: result.secure_url, name: file.name });
      }
      setAttachedImages((previous) => [...previous, ...uploaded].slice(0, 4));
      toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} ready for visual search.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the search image.");
    } finally {
      setImageUploading(false);
    }
  };


  const handleAddToCart = async (rec: { handle: string; name: string }) => {
    const liveProd = products.find((p) => p.handle === rec.handle && p.availableForSale);
    if (liveProd) await addItem(liveProd);
    else toast.error(`${rec.name} is not available in the current store catalog.`);
  };

  const handleBuyAll = async () => {
    const matched = shoppingList.map((item) => products.find((product) => product.handle === item.handle) || products.find((product) => product.name.toLowerCase() === item.name.toLowerCase())).filter((product): product is Product => Boolean(product?.availableForSale));
    if (!matched.length) {
      toast.error("There are no catalog products in this list to add to Cart yet.");
      return;
    }
    if (matched.length < shoppingList.length) toast.info("Some items are custom notes or unavailable products and were left out of Cart.");
    const added = await addItems(matched);
    if (added) toast.success(`Added ${matched.length} item${matched.length === 1 ? "" : "s"} to Cart.`);
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const catalog = useMemo(
    () => assistantCatalog(products, collections, location, shoppingList),
    [products, collections, location, shoppingList],
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
      getAllProducts(),
      getCollections(250),
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
    const images = attachedImages;
    const text = textToSend || input.trim() || (images.length ? "Please identify the item in this image and find the closest Nexus products." : "");
    if ((!text && images.length === 0) || loading || imageUploading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      ...(images.length ? { imageUrls: images.map((image) => image.url), imageNames: images.map((image) => image.name) } : {}),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setAttachedImages([]);
    setLoading(true);

    try {
      const history = [...messages, userMessage].slice(-100).map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.imageUrls?.length ? { imageUrls: m.imageUrls } : {}),
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

      applyShoppingListChanges(parseAssistantPayload(assistantMessage.content).shoppingList);

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
            <img src="/cari-mark.jpg" alt="" className="cari-mark-icon" />
          </div>
          <span className="ai-trigger-text">
            Ask Cari
          </span>
        </button>
      )}

      {isOpen && (
        <div className={`ai-assistant-card ${isMinimized ? "is-minimized" : ""}`}>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => { if (event.target.files?.length) void handleImageFiles(event.target.files); event.target.value = ""; }} />
          {/* Header */}
          <div className="ai-assistant-header">
            <div className="ai-assistant-title">
              <div className="ai-avatar">
                <img src="/cari-mark.jpg" alt="" className="cari-mark-icon" />
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
              <div className="ai-assistant-tabs">
                <span className="ai-thread-label">Your Cari conversation</span>
                <button type="button" onClick={() => setActiveTab(activeTab === "list" ? "chat" : "list")} className={`ai-list-toggle ${activeTab === "list" ? "is-active" : ""}`}>
                  <ListChecks size={14} /> Shopping list <span>{shoppingList.length}</span>
                </button>
              </div>

              {isAdminRoute && adminEmails !== null && (
                <div className="max-h-36 overflow-y-auto border-b border-slate-200 bg-amber-50 p-2 text-[11px] text-slate-800">
                  <div className="mb-1 flex items-center justify-between font-semibold"><span>Firebase emails ({adminEmails.length})</span><button type="button" onClick={() => setAdminEmails(null)} aria-label="Hide customer emails">Hide</button></div>
                  {adminEmails.length ? adminEmails.map((email) => <div key={email}>{email}</div>) : <div>No Firebase customer accounts found.</div>}
                </div>
              )}
              {activeTab === "list" ? (
                /* Shopping List View */
                <div className="ai-assistant-messages flex flex-col gap-3 p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks size={14} className="text-amber-500" /> Shopping List
                    </span>
                    {shoppingList.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={handleBuyAll} className="shopping-list-buy-all"><ShoppingCart size={13} /> Buy all</button>
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
                      </div>
                    )}
                  </div>

                  {shoppingList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <ListChecks size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                      <p>Your Cari Shopping List is empty.</p>
                      <p className="text-[11px] text-slate-400">Ask Cari for product recommendations or add items directly from chat!</p>
                      <form className="shopping-list-add-form" onSubmit={(event) => { event.preventDefault(); if (!newListItem.trim()) return; addToShoppingList({ name: newListItem, handle: `custom:${newListItem.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` }); setNewListItem(""); }}>
                        <input value={newListItem} onChange={(event) => setNewListItem(event.target.value)} placeholder="Add an item to your list" aria-label="Add a shopping list item" />
                        <button type="submit" disabled={!newListItem.trim()}>Add</button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <form className="shopping-list-add-form" onSubmit={(event) => { event.preventDefault(); if (!newListItem.trim()) return; addToShoppingList({ name: newListItem, handle: `custom:${newListItem.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` }); setNewListItem(""); }}>
                        <input value={newListItem} onChange={(event) => setNewListItem(event.target.value)} placeholder="Add an item you discussed with Cari" aria-label="Add a shopping list item" />
                        <button type="submit" disabled={!newListItem.trim()}>Add</button>
                      </form>
                      {shoppingList.map((item) => {
                        const matchedProd = products.find((p) => p.handle === item.handle);
                        const imgUrl = item.image || matchedProd?.image?.url;
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            {imgUrl ? <img src={imgUrl} alt={item.name} className="w-12 h-12 object-cover rounded-md" /> : <div className="shopping-list-item-placeholder"><ListChecks size={17} /></div>}
                            <div className="flex-1 min-w-0">
                              <input className="shopping-list-item-name" value={item.name} onChange={(event) => setShoppingList((previous) => previous.map((saved) => saved.id === item.id ? { ...saved, name: event.target.value } : saved))} aria-label={`Edit ${item.name}`} />
                              {item.price && <span className="text-xs text-amber-600 font-bold">{item.price}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAddToCart({ handle: item.handle, name: item.name })}
                                className="p-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 font-medium text-xs flex items-center gap-1"
                                title="Add to Cart"
                              >
                                <ShoppingCart size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromShoppingList(item.id)}
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
                          <div className="ai-msg-avatar"><img src="/cari-mark.jpg" alt="" className="cari-mark-icon" /></div>
                        )}
                        <div className={`ai-message-bubble ${msg.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
                          {msg.imageUrls?.length ? (
                            <div className={`gemini-image-grid gemini-image-count-${Math.min(msg.imageUrls.length, 4)}`}>
                              {msg.imageUrls.map((url, imageIndex) => (
                                <figure key={`${msg.id}-${imageIndex}`} className="gemini-image-wrapper">
                                  <img src={url} alt={msg.imageNames?.[imageIndex] || "Uploaded product search"} />
                                  <figcaption>{msg.imageNames?.[imageIndex] || "Product search image"}</figcaption>
                                  <div className="gemini-image-tools">
                                    <button type="button" onClick={async () => { try { const response = await fetch(url); if (!response.ok) throw new Error("Download failed"); const objectUrl = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = objectUrl; link.download = msg.imageNames?.[imageIndex] || `cari-search-${imageIndex + 1}.jpg`; link.click(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); } catch { window.open(url, "_blank", "noopener,noreferrer"); } }} aria-label="Download image"><Download size={15} /></button>
                                    <button type="button" onClick={() => setExpandedImage(url)} aria-label="Expand image"><Maximize size={15} /></button>
                                    <button type="button" onClick={() => setMessages((previous) => previous.map((message) => message.id === msg.id ? { ...message, imageUrls: message.imageUrls?.filter((_, index) => index !== imageIndex), imageNames: message.imageNames?.filter((_, index) => index !== imageIndex) } : message))} aria-label="Remove image from this message"><X size={15} /></button>
                                  </div>
                                </figure>
                              ))}
                            </div>
                          ) : null}
                          {msg.role === "assistant" ? (
                            (() => {
                              const { cleanText, recommendations } = parseAssistantPayload(msg.content);
                              return (
                                <div className="ai-message-content ai-markdown">
                                  <Streamdown>{cleanText}</Streamdown>

                                  {recommendations.length > 0 && (
                                    <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles size={11} /> Recommended Items
                                      </span>
                                      {recommendations.map((rec: any, idx: number) => {
                                        const matchedProd = products.find((p) => p.handle === rec.handle && p.availableForSale);
                                        if (!matchedProd) return null;
                                        const imgUrl = matchedProd.image?.url || matchedProd.images[0]?.url;
                                        return (
                                          <div key={matchedProd.handle} className="cari-recommendation-card">
                                            <Link href={`/products/${matchedProd.handle}`} className="cari-recommendation-image" aria-label={`View ${matchedProd.name}`}>
                                              {imgUrl ? <img src={imgUrl} alt={matchedProd.name} loading="lazy" /> : <span aria-hidden="true">Nexus</span>}
                                            </Link>
                                            <div className="cari-recommendation-details">
                                              <strong className="block text-xs font-semibold truncate text-slate-900 dark:text-slate-100">{matchedProd.name}</strong>
                                              <span className="text-xs text-amber-600 font-bold">{formatPrice(matchedProd.price)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => addToShoppingList({ handle: matchedProd.handle, name: matchedProd.name, price: formatPrice(matchedProd.price), image: imgUrl })}
                                                className="p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400"
                                                title="Save to Cari Shopping List"
                                              >
                                                <Bookmark size={14} />
                                              </button>
                                              <Link href={`/products/${matchedProd.handle}`} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300" title="View details">
                                                <ArrowUpRight size={14} />
                                              </Link>
                                              <button type="button" onClick={() => handleAddToCart({ handle: matchedProd.handle, name: matchedProd.name })} className="p-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 font-medium text-xs flex items-center gap-1" title="Add to Cart">
                                                <ShoppingCart size={13} />
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
                        <div className="ai-msg-avatar"><img src="/cari-mark.jpg" alt="" className="cari-mark-icon gemini-sparkle-loader" /></div>
                        <div className="ai-message-bubble assistant-bubble ai-loading-bubble">
                          <span>{messages.at(-1)?.imageUrls?.length ? "Cari is comparing your photo with the catalog…" : "Cari is thinking…"}</span>
                          <div className="ai-shimmer-lines" aria-hidden="true"><i /><i /><i /></div>
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
                    {attachedImages.length > 0 && <div className="ai-pending-images">{attachedImages.map((image, index) => <div key={`${image.url}-${index}`} className="ai-pending-image"><img src={image.url} alt={image.name} /><span>{image.name}</span><button type="button" onClick={() => setAttachedImages((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${image.name}`}><X size={13} /></button></div>)}</div>}
                    <div className="ai-composer-row">
                      <button type="button" className="ai-attach-btn" onClick={() => imageInputRef.current?.click()} disabled={imageUploading || attachedImages.length >= 4} aria-label="Upload an image for visual product search" title="Search products by image">
                        {imageUploading ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
                      </button>
                      <textarea
                        ref={textInputRef}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 200)}px`; }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); } }}
                        placeholder={imageUploading ? "Uploading image securely…" : "Ask Cari or attach a product photo…"}
                        className="ai-assistant-input"
                        rows={1}
                        disabled={loading || imageUploading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={(!input.trim() && attachedImages.length === 0) || loading || imageUploading}
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
      {expandedImage && <div className="ai-image-lightbox" role="dialog" aria-modal="true" aria-label="Expanded image" onClick={() => setExpandedImage("")}><button type="button" onClick={() => setExpandedImage("")} aria-label="Close expanded image"><X size={22} /></button><img src={expandedImage} alt="Expanded product search upload" onClick={(event) => event.stopPropagation()} /></div>}
    </div>
  );
}
