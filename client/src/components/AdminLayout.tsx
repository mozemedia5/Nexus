import React, { useState, useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  Menu,
  X,
  Shield,
  Award,
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  Megaphone,
  TrendingUp,
  Users,
  UserPlus,
  LogOut,
  ExternalLink,
  Sun,
  Moon,
  Search,
  Image as ImageIcon,
  Mic,
  ArrowRight,
  Mail,
  KeyRound,
  Command,
} from "lucide-react";
import { toast } from "sonner";
import AiAssistant from "@/components/AiAssistant";
import { getAdminAuthHeaders, getFirebaseAuth, getFirebaseStatus, verifyAdminSession } from "@/lib/firebase";

export interface AdminSession {
  authenticated: boolean;
  role: "superadmin" | "admin";
  email: string;
  name: string;
  uid: string;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const [session, setSession] = useState<AdminSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const firebaseStatus = getFirebaseStatus();

  useEffect(() => {
    // Remove values created by the former client-side passkey and admin-list implementation.
    try {
      localStorage.removeItem("nexus_admin_session");
      localStorage.removeItem("nexus_admins_v1");
    } catch {}
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthChecking(false);
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSession(null);
        setAuthError("");
        setAuthChecking(false);
        return;
      }
      setAuthChecking(true);
      void verifyAdminSession(user)
        .then((verified) => {
          if (auth.currentUser?.uid === user.uid) {
            setSession(verified);
            setAuthError(verified ? "" : "This Firebase account does not have Nexus administrator access.");
          }
        })
        .catch((error) => {
          if (auth.currentUser?.uid === user.uid) {
            setSession(null);
            setAuthError(error instanceof Error ? error.message : "Administrator session could not be verified.");
          }
        })
        .finally(() => setAuthChecking(false));
    });
  }, []);

  // Theme state: dark (#131314) vs light (#FFFFFF)
  const [theme, setTheme] = useState<"dark" | "light">( () => {
    try {
      const saved = localStorage.getItem("nexus_admin_theme_v1");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem("nexus_admin_theme_v1", theme);
    } catch {}
  }, [theme]);

  // Sidebar collapse state for desktop
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  // Mobile overlay sidebar drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Command input state for bottom pill
  const [commandInput, setCommandInput] = useState("");
  const [isRecordingMic, setIsRecordingMic] = useState(false);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      await fetch("/api/admin/logout", { method: "POST", headers });
    } catch {}
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth).catch(() => {});
    setSession(null);
    toast.info("Signed out of Admin Console");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      toast.error("Enter your administrator email and password.");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      toast.error("Firebase Authentication is not configured for this site.");
      return;
    }
    setAuthChecking(true);
    setAuthError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const verified = await verifyAdminSession(credential.user);
      if (!verified) {
        await signOut(auth);
        setSession(null);
        toast.error("This verified Firebase account has not been granted administrator access.");
        return;
      }
      setSession(verified);
      setPasswordInput("");
      toast.success(`Welcome, ${verified.role === "superadmin" ? "Superadministrator" : "Administrator"}.`);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
        ? "Invalid email or password."
        : code === "auth/too-many-requests"
          ? "Too many sign-in attempts. Try again later."
          : error instanceof Error ? error.message : "Administrator sign-in failed.";
      toast.error(message);
      setAuthError(message);
    } finally {
      setAuthChecking(false);
    }
  };

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/admin/sales", label: "Sales Report", icon: TrendingUp },
    { href: "/admin/users", label: "Customer Interests", icon: Users },
    ...(session?.role === "superadmin"
      ? [{ href: "/admin/admins", label: "Manage Admins", icon: UserPlus }]
      : []),
  ];

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    if (cmd.includes("order")) {
      setLocation("/admin/orders");
    } else if (cmd.includes("product")) {
      setLocation("/admin/products");
    } else if (cmd.includes("analytic") || cmd.includes("stat")) {
      setLocation("/admin/analytics");
    } else if (cmd.includes("sale") || cmd.includes("revenue")) {
      setLocation("/admin/sales");
    } else if (cmd.includes("campaign") || cmd.includes("promo")) {
      setLocation("/admin/campaigns");
    } else if (cmd.includes("user") || cmd.includes("customer")) {
      setLocation("/admin/users");
    } else if (cmd.includes("dash")) {
      setLocation("/admin/dashboard");
    } else {
      toast.info(`Command executed: "${commandInput}"`);
    }
    setCommandInput("");
  };

  const handleMicClick = () => {
    setIsRecordingMic(!isRecordingMic);
    if (!isRecordingMic) {
      toast.info("Listening for voice commands...");
      setTimeout(() => {
        setIsRecordingMic(false);
        setCommandInput("Show recent orders");
        toast.success("Recognized voice command: 'Show recent orders'");
      }, 2500);
    }
  };

  const handleImageUploadClick = () => {
    window.dispatchEvent(new CustomEvent("nexus-cari-upload-request"));
  };

  if (authChecking && !session) {
    return (
      <div data-admin-theme={theme} className={`min-h-screen flex items-center justify-center font-sans ${theme === "dark" ? "bg-[#131314] text-[#E3E3E3]" : "bg-[#F8F9FA] text-[#1F1F1F]"}`}>
        <div className="text-center"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /><p className="text-sm">Verifying administrator session…</p></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        data-admin-theme={theme}
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 font-sans ${
          theme === "dark" ? "bg-[#131314] text-[#E3E3E3]" : "bg-[#F8F9FA] text-[#1F1F1F]"
        }`}
      >
        <div
          className={`w-full max-w-md border rounded-3xl p-8 shadow-2xl text-center transition-colors duration-300 ${
            theme === "dark"
              ? "bg-[#1E1F20] border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="w-14 h-14 bg-amber-500/20 text-amber-500 rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black mb-1">Nexus Admin Portal</h1>
          <p
            className={`text-xs mb-6 ${
              theme === "dark" ? "text-[#C4C7C5]" : "text-[#5E5E5E]"
            }`}
          >
            Nexus Store Management Portal
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="relative">
              <Mail
                size={16}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  theme === "dark" ? "text-[#C4C7C5]" : "text-[#5E5E5E]"
                }`}
              />
              <input
                type="email"
                autoComplete="username"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Administrator email"
                aria-label="Administrator email"
                className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-[#131314] border-slate-800 text-white placeholder-slate-500"
                    : "bg-[#F0F4F9] border-slate-300 text-slate-900 placeholder-slate-400"
                }`}
                autoFocus
                required
              />
            </div>
            <div className="relative">
              <KeyRound size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme === "dark" ? "text-[#C4C7C5]" : "text-[#5E5E5E]"}`} />
              <input
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors ${theme === "dark" ? "bg-[#131314] border-slate-800 text-white placeholder-slate-500" : "bg-[#F0F4F9] border-slate-300 text-slate-900 placeholder-slate-400"}`}
                required
              />
            </div>
            <button
              type="submit"
              disabled={authChecking || !firebaseStatus.configured}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{authChecking ? "Verifying…" : "Sign in securely"}</span>
              <ArrowRight size={16} />
            </button>
            {authError && <p role="alert" className="text-xs text-rose-500">{authError}</p>}
          </form>

          <div
            className={`mt-6 pt-4 border-t text-[11px] text-left space-y-1 transition-colors ${
              theme === "dark" ? "border-slate-800 text-[#C4C7C5]" : "border-slate-200 text-[#5E5E5E]"
            }`}
          >
            <p className="font-semibold">Authorized Firebase accounts only.</p>
            <p>Administrator access requires a verified email and server-issued role.</p>
            {!firebaseStatus.configured && <p className="text-rose-500">Firebase Authentication is not configured.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-admin-theme={theme}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        theme === "dark" ? "dark bg-[#131314] text-[#E3E3E3]" : "bg-[#F8F9FA] text-[#1F1F1F]"
      }`}
    >
      <div className="flex flex-1 relative overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r transition-all duration-300 z-30 ${
            sidebarExpanded ? "w-[300px]" : "w-16"
          } ${
            theme === "dark"
              ? "bg-[#1E1F20] border-slate-800/80"
              : "bg-[#F0F4F9] border-slate-200"
          }`}
        >
          {/* Sidebar Top / Brand */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
            {sidebarExpanded ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
                  <Shield size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight flex items-center gap-1">
                    Nexus <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-mono">EXECUTIVE</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 mx-auto">
                <Shield size={18} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === "dark"
                  ? "hover:bg-slate-800 text-[#C4C7C5]"
                  : "hover:bg-slate-200 text-[#5E5E5E]"
              }`}
              title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Sidebar Links */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const isActive =
                location === link.href ||
                (link.href === "/admin/dashboard" && location === "/admin") ||
                location.startsWith(link.href + "/");
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                      : theme === "dark"
                      ? "text-[#C4C7C5] hover:bg-slate-800/60 hover:text-white"
                      : "text-[#5E5E5E] hover:bg-slate-200/80 hover:text-[#1F1F1F]"
                  } ${!sidebarExpanded && "justify-center px-0"}`}
                  title={link.label}
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarExpanded && <span>{link.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Bottom Actions */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("nexus-open-cari"))}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === "dark" ? "hover:bg-slate-800 text-[#C4C7C5]" : "hover:bg-slate-200 text-[#5E5E5E]"} ${!sidebarExpanded && "justify-center px-0"}`}
              title="Open Cari visual product search"
            >
              <img src="/cari-mark.jpg" alt="" className="cari-mark-icon shrink-0" />
              {sidebarExpanded && <span>Cari visual search</span>}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                theme === "dark"
                  ? "hover:bg-slate-800 text-[#C4C7C5]"
                  : "hover:bg-slate-200 text-[#5E5E5E]"
              } ${!sidebarExpanded && "justify-center px-0"}`}
              title="Toggle Theme Mode"
            >
              {theme === "dark" ? <Sun size={18} className="text-amber-400 shrink-0" /> : <Moon size={18} className="text-slate-700 shrink-0" />}
              {sidebarExpanded && <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 transition-colors ${
                theme === "dark" ? "hover:bg-rose-500/10" : "hover:bg-rose-100"
              } ${!sidebarExpanded && "justify-center px-0"}`}
              title="Sign Out"
            >
              <LogOut size={18} className="shrink-0" />
              {sidebarExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div
              className={`relative flex flex-col w-72 max-w-[80vw] h-full p-4 border-r transition-colors ${
                theme === "dark"
                  ? "bg-[#1E1F20] border-slate-800 text-[#E3E3E3]"
                  : "bg-[#F0F4F9] border-slate-200 text-[#1F1F1F]"
              }`}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-amber-500" />
                  <span className="font-bold text-sm">Nexus Executive Console</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    location === link.href ||
                    (link.href === "/admin/dashboard" && location === "/admin") ||
                    location.startsWith(link.href + "/");
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold ${
                        isActive
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : theme === "dark"
                          ? "text-[#C4C7C5] hover:bg-slate-800"
                          : "text-[#5E5E5E] hover:bg-slate-200"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => { setMobileDrawerOpen(false); window.dispatchEvent(new CustomEvent("nexus-open-cari")); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <img src="/cari-mark.jpg" alt="" className="cari-mark-icon" />
                  <span>Cari visual search</span>
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                  <span>Switch Theme</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header Bar */}
          <header
            className={`sticky top-0 z-20 h-16 border-b flex items-center justify-between px-4 sm:px-6 transition-colors ${
              theme === "dark"
                ? "bg-[#131314]/90 border-slate-800/80 backdrop-blur-md"
                : "bg-[#FFFFFF]/90 border-slate-200 backdrop-blur-md"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg text-amber-500"
              >
                <Menu size={20} />
              </button>
              <h2 className="text-sm font-bold tracking-tight">
                {navLinks.find((l) => l.href === location)?.label || "Admin Console"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  theme === "dark"
                    ? "bg-[#1E1F20] hover:bg-slate-800 text-[#E3E3E3]"
                    : "bg-[#F0F4F9] hover:bg-slate-200 text-[#1F1F1F]"
                }`}
              >
                <span>View Storefront</span>
                <ExternalLink size={12} />
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold">{session.name || "Store Admin"}</div>
                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-500 uppercase">
                    {session.role}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Canvas Content Container (Centered max-w-5xl) */}
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            {children}
          </main>

          {/* Fixed Bottom Quick Action / Command Pill Box */}
          <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none px-4">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <form
                onSubmit={handleCommandSubmit}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-[#1E1F20] border-slate-700/80 text-white focus-within:border-amber-500"
                    : "bg-[#F0F4F9] border-slate-300 text-slate-900 focus-within:border-amber-500"
                }`}
              >
                <Command size={18} className="text-amber-500 shrink-0" />
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type admin command or search (e.g. 'Show orders', 'Analytics', 'Products')..."
                  className="flex-1 bg-transparent text-xs sm:text-sm focus:outline-none placeholder:text-slate-400"
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleImageUploadClick}
                    className={`p-2 rounded-full transition-colors ${
                      theme === "dark"
                        ? "hover:bg-slate-800 text-[#C4C7C5]"
                        : "hover:bg-slate-200 text-[#5E5E5E]"
                    }`}
                    title="Upload image / media"
                  >
                    <ImageIcon size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleMicClick}
                    className={`p-2 rounded-full transition-colors ${
                      isRecordingMic
                        ? "bg-rose-500 text-white animate-pulse"
                        : theme === "dark"
                        ? "hover:bg-slate-800 text-[#C4C7C5]"
                        : "hover:bg-slate-200 text-[#5E5E5E]"
                    }`}
                    title="Voice search command"
                  >
                    <Mic size={16} />
                  </button>

                  <button
                    type="submit"
                    disabled={!commandInput.trim()}
                    className="p-2 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold transition-colors disabled:opacity-40 shrink-0"
                    title="Execute command"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <AiAssistant />
    </div>
  );
}
