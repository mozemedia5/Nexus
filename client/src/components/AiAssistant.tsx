import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Send,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Moon,
  Sun,
  Settings,
  HelpCircle,
  History,
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Compass,
  Lightbulb,
  Code,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
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

interface ConversationSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export function GeminiSparkleIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`gemini-sparkle-animated ${className}`}
    >
      <defs>
        <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="gemini-sparkle-stop-1" />
          <stop offset="100%" className="gemini-sparkle-stop-2" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z"
        fill="url(#geminiGrad)"
      />
    </svg>
  );
}

const DEFAULT_SUGGESTIONS = [
  { icon: Compass, text: "Compare top Smart Home & Workspace devices in stock" },
  { icon: Lightbulb, text: "Suggest an ergonomic setup for modern desk focus" },
  { icon: Code, text: "Explain order tracking and store fulfillment process" },
  { icon: SparklesIcon, text: "What are the active deals and multi-item discounts?" },
];

export default function AiAssistant() {
  const [location] = useLocation();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea behavior up to 200px max-height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollPx = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollPx, 200)}px`;
    }
  }, [input]);

  // Handle Light/Dark class on body or container
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("gemini-light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.remove("gemini-light");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    if (catalogLoaded) return;
    if (!shopifyConfigured) {
      setProducts(FALLBACK_PRODUCTS);
      setCatalogLoaded(true);
      return;
    }
    Promise.all([
      getProducts({ first: 100, sortKey: "CREATED_AT" }),
      getCollections(30),
    ])
      .then(([liveProducts, liveCollections]) => {
        setProducts(liveProducts.length > 0 ? liveProducts : FALLBACK_PRODUCTS);
        setCollections(liveCollections);
      })
      .catch(() => setProducts(FALLBACK_PRODUCTS))
      .finally(() => setCatalogLoaded(true));
  }, [catalogLoaded]);

  // Conversations state
  const [conversations, setConversations] = useState<ConversationSession[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_gemini_conversations_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
      }
    } catch {}
    return [
      {
        id: "session-default",
        title: "Nexus Admin & Shopping Copilot",
        updatedAt: new Date(),
        messages: [
          {
            id: "welcome-1",
            role: "assistant",
            content: "Hello! I am Gemini, your intelligent assistant for Nexus. How can I help you manage orders, explore high-performance productivity gear, or automate your workspace today?",
            timestamp: new Date(),
          },
        ],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>("session-default");

  const currentSession = useMemo(() => {
    return conversations.find((c) => c.id === activeSessionId) || conversations[0];
  }, [conversations, activeSessionId]);

  const messages = currentSession?.messages || [];

  useEffect(() => {
    try {
      localStorage.setItem("nexus_gemini_conversations_v2", JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ConversationSession = {
      id: newId,
      title: "New Chat",
      updatedAt: new Date(),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: "Started a new conversation. Ask me anything about Nexus store operations, order tracking, or productivity gear recommendations.",
          timestamp: new Date(),
        },
      ],
    };
    setConversations((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMobileDrawerOpen(false);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Update active session title if new
    setConversations((prev) =>
      prev.map((session) => {
        if (session.id === currentSession.id) {
          const newTitle = session.title === "New Chat" ? text.slice(0, 30) : session.title;
          return {
            ...session,
            title: newTitle,
            updatedAt: new Date(),
            messages: [...session.messages, userMsg],
          };
        }
        return session;
      })
    );

    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const catalogPayload = {
        currentPath: location,
        products: products.map((p) => ({
          handle: p.handle,
          name: p.name,
          description: p.description,
          price: p.price,
          categoryLabel: p.categoryLabel,
        })),
        collections: collections.map((c) => ({
          handle: c.handle,
          title: c.title,
        })),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, catalog: catalogPayload }),
      });

      if (!res.ok) {
        throw new Error("Failed to connect to Gemini AI Assistant service.");
      }

      const data = await res.json();

      // Clean raw JSON cards/widgets out of assistant content to keep prose standard
      let replyContent = data.reply || "I couldn't process that response. Please try again.";
      replyContent = replyContent.replace(/```json[\s\S]*?```/g, "").trim();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyContent,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((session) => {
          if (session.id === currentSession.id) {
            return {
              ...session,
              updatedAt: new Date(),
              messages: [...session.messages, assistantMsg],
            };
          }
          return session;
        })
      );
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message || "An error occurred connecting to Gemini. Please try again.",
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((session) => {
          if (session.id === currentSession.id) {
            return {
              ...session,
              updatedAt: new Date(),
              messages: [...session.messages, errorMsg],
            };
          }
          return session;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex font-gemini text-[var(--gemini-text-primary)] transition-colors duration-200 ${
        theme === "light" ? "gemini-light bg-[#f0f4f9]" : "bg-[#131314]"
      }`}
    >
      {/* 1. DESKTOP COLLAPSIBLE SIDEBAR (300px) */}
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--gemini-border)] bg-[var(--gemini-sidebar-bg)] transition-all duration-300 ease-in-out select-none z-30 ${
          sidebarOpen ? "w-[300px]" : "w-[68px]"
        }`}
      >
        {/* Top Control Header */}
        <div className="h-16 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 rounded-full text-[var(--gemini-text-muted)] hover:text-[var(--gemini-text-primary)] hover:bg-[var(--gemini-surface-hover)] transition-colors"
            title={sidebarOpen ? "Collapse menu" : "Expand menu"}
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>

          {sidebarOpen && (
            <span className="text-xs font-semibold text-[var(--gemini-text-muted)] tracking-wider uppercase">
              Gemini
            </span>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-3 my-2">
          <button
            type="button"
            onClick={handleNewChat}
            className={`w-full flex items-center gap-3 py-3 rounded-full bg-[var(--gemini-surface-hover)] hover:bg-[var(--gemini-surface-active)] text-[var(--gemini-text-primary)] font-medium text-sm transition-all shadow-sm ${
              sidebarOpen ? "px-4" : "justify-center px-0"
            }`}
          >
            <Plus size={18} className="text-[var(--gemini-sparkle-blue)]" />
            {sidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {/* Recent Chat History */}
        {sidebarOpen ? (
          <div className="flex-1 overflow-y-auto px-3 py-2 gemini-scrollbar space-y-1">
            <div className="px-3 py-1.5 text-xs font-medium text-[var(--gemini-text-muted)] flex items-center gap-1.5">
              <History size={13} />
              <span>Recent</span>
            </div>
            {conversations.map((sess) => (
              <button
                key={sess.id}
                type="button"
                onClick={() => setActiveSessionId(sess.id)}
                className={`w-full text-left px-3 py-2.5 rounded-full text-xs font-medium truncate flex items-center gap-2.5 transition-colors ${
                  activeSessionId === sess.id
                    ? "bg-[var(--gemini-surface-active)] text-[var(--gemini-text-primary)] font-semibold"
                    : "text-[var(--gemini-text-secondary)] hover:bg-[var(--gemini-surface-hover)] hover:text-[var(--gemini-text-primary)]"
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0 text-[var(--gemini-text-muted)]" />
                <span className="truncate">{sess.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Sidebar Footer Navigation & Controls */}
        <div className="p-3 border-t border-[var(--gemini-border)] space-y-1 text-xs">
          {sidebarOpen && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--gemini-text-muted)] uppercase tracking-wider">
              Nexus Quick Portal
            </div>
          )}

          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-3 py-2 rounded-full text-[var(--gemini-text-secondary)] hover:bg-[var(--gemini-surface-hover)] hover:text-[var(--gemini-text-primary)] transition-colors ${
              sidebarOpen ? "px-3" : "justify-center"
            }`}
            title="Admin Dashboard"
          >
            <LayoutDashboard size={18} />
            {sidebarOpen && <span>Admin Dashboard</span>}
          </Link>

          <Link
            href="/admin/orders"
            className={`flex items-center gap-3 py-2 rounded-full text-[var(--gemini-text-secondary)] hover:bg-[var(--gemini-surface-hover)] hover:text-[var(--gemini-text-primary)] transition-colors ${
              sidebarOpen ? "px-3" : "justify-center"
            }`}
            title="Manage Orders"
          >
            <ShoppingBag size={18} />
            {sidebarOpen && <span>Orders</span>}
          </Link>

          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`w-full flex items-center gap-3 py-2 rounded-full text-[var(--gemini-text-secondary)] hover:bg-[var(--gemini-surface-hover)] hover:text-[var(--gemini-text-primary)] transition-colors ${
              sidebarOpen ? "px-3" : "justify-center"
            }`}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {sidebarOpen && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER MENU (PHONE VIEWPORT) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-[280px] max-w-[80vw] bg-[var(--gemini-sidebar-bg)] border-r border-[var(--gemini-border)] h-full flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--gemini-border)]">
              <div className="flex items-center gap-2">
                <GeminiSparkleIcon size={20} />
                <span className="font-semibold text-sm">Gemini Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNewChat}
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-full bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-primary)] font-medium text-sm"
            >
              <Plus size={18} className="text-[var(--gemini-sparkle-blue)]" />
              <span>New chat</span>
            </button>

            <div className="flex-1 overflow-y-auto my-4 space-y-1 gemini-scrollbar">
              <span className="text-xs font-semibold text-[var(--gemini-text-muted)] px-2">History</span>
              {conversations.map((sess) => (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => {
                    setActiveSessionId(sess.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-full text-xs font-medium truncate flex items-center gap-2 ${
                    activeSessionId === sess.id
                      ? "bg-[var(--gemini-surface-active)] text-[var(--gemini-text-primary)] font-semibold"
                      : "text-[var(--gemini-text-secondary)]"
                  }`}
                >
                  <MessageSquare size={14} />
                  <span className="truncate">{sess.title}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--gemini-border)] space-y-2 text-xs">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-full text-[var(--gemini-text-secondary)]"
              >
                <LayoutDashboard size={18} />
                <span>Admin Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-[var(--gemini-text-secondary)]"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CHAT WINDOW CONTAINER (FULL-BLEED 100vh) */}
      <main className="flex-1 flex flex-col h-screen min-w-0 relative overflow-hidden bg-[var(--gemini-bg)]">
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-[var(--gemini-border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-muted)]"
            >
              <PanelLeftOpen size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-[var(--gemini-text-primary)]">
                Gemini
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-muted)]">
                1.5 Flash
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--gemini-surface-hover)] hover:bg-[var(--gemini-surface-active)] text-xs font-medium text-[var(--gemini-text-secondary)] transition-colors"
            >
              <span>View Live Store</span>
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-muted)]"
              title="Toggle light/dark theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Chat Feed Scroll Area (Centered Max-Width 768px) */}
        <div className="flex-1 overflow-y-auto px-0 py-6 gemini-scrollbar flex flex-col items-center">
          <div className="w-full max-w-[768px] px-4 md:px-6 flex-1 flex flex-col">
            {messages.length <= 1 && (
              <div className="my-auto py-8 text-left space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-normal tracking-tight">
                    <span className="bg-gradient-to-r from-[#4285f4] via-[#9b51e0] to-[#ea4335] bg-clip-text text-transparent font-medium">
                      Hello, Store Admin
                    </span>
                  </h1>
                  <p className="text-2xl sm:text-3xl text-[var(--gemini-text-muted)] font-normal">
                    How can I help you streamline Nexus today?
                  </p>
                </div>

                {/* Clean Gemini Suggestion Pills (No AI Cards) */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {DEFAULT_SUGGESTIONS.map((sug, idx) => {
                    const Icon = sug.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(sug.text)}
                        className="px-3.5 py-2 rounded-full bg-[var(--gemini-surface)] hover:bg-[var(--gemini-surface-hover)] border border-[var(--gemini-border)] text-left flex items-center gap-2 text-xs text-[var(--gemini-text-secondary)] hover:text-[var(--gemini-text-primary)] transition-all"
                      >
                        <Icon size={14} className="text-[var(--gemini-sparkle-blue)]" />
                        <span>{sug.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="space-y-6 pb-28">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col space-y-2">
                  {msg.role === "user" ? (
                    <div className="self-end max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-[24px] bg-[var(--gemini-prompt-bg)] text-[var(--gemini-text-primary)] gemini-user-prompt-text shadow-xs">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 text-[var(--gemini-text-primary)] gemini-assistant-response-text">
                      <div className="p-1 rounded-full flex-shrink-0 mt-0.5">
                        <GeminiSparkleIcon size={22} />
                      </div>
                      <div className="flex-1 space-y-2 min-w-0 leading-relaxed text-[15px]">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Gemini Sparkle Loading Indicator */}
              {loading && (
                <div className="flex items-center gap-3 text-[var(--gemini-text-muted)] pt-2">
                  <GeminiSparkleIcon size={24} />
                  <span className="text-xs font-normal tracking-wide animate-pulse">
                    Gemini is thinking...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* 4. FLOATING BOTTOM-ANCHORED CHAT INPUT BOX */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[var(--gemini-bg)] via-[var(--gemini-bg)] to-transparent flex justify-center pointer-events-none z-20">
          <div className="w-full max-w-[768px] mx-auto pointer-events-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-end gap-2 p-2 rounded-[28px] sm:rounded-[32px] bg-[var(--gemini-input-bg)] border border-[var(--gemini-border)] shadow-lg transition-all focus-within:border-[var(--gemini-sparkle-blue)]"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Gemini about store metrics, products, or productivity gear..."
                rows={1}
                className="flex-1 max-h-[200px] py-2.5 px-4 bg-transparent text-[var(--gemini-text-primary)] placeholder-[var(--gemini-text-muted)] text-sm sm:text-base outline-none resize-none gemini-scrollbar"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 rounded-full bg-[var(--gemini-surface-hover)] text-[var(--gemini-text-primary)] hover:bg-[var(--gemini-sparkle-blue)] hover:text-white disabled:opacity-30 disabled:hover:bg-[var(--gemini-surface-hover)] disabled:hover:text-[var(--gemini-text-primary)] transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="text-center mt-2 text-[11px] text-[var(--gemini-text-muted)]">
              Gemini may display inaccurate info, so double-check store inventory and tracking details.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
