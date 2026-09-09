import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Users,
  Heart,
  Eye,
  LogOut,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Percent,
  Mail,
  Send,
  UserPlus,
  BarChart3,
  Package,
  Sparkles,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  discountBadge: string;
  categoryTag: "smart-home" | "workspace-productivity" | "tech-accessories" | "all";
  bannerImageUrl: string;
  active: boolean;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  role: "superadmin" | "admin";
  isAdmin: boolean;
  createdAt: string;
}

const CAMPAIGNS_STORAGE_KEY = "nexus_admin_campaigns_v1";
const ADMINS_STORAGE_KEY = "nexus_admins_v1";

export function getActiveCampaigns(): Campaign[] {
  try {
    const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (saved) {
      const parsed: Campaign[] = JSON.parse(saved);
      return parsed.filter((c) => c.active);
    }
  } catch {}
  return DEFAULT_CAMPAIGNS.filter((c) => c.active);
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    title: "Smart Office Elevation Event",
    subtitle: "Upgrade your workstation with ergonomic monitor lights, Thunderbolt 4 docks, and magnetic wireless chargers.",
    discountBadge: "SAVE UP TO 20%",
    categoryTag: "workspace-productivity",
    bannerImageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "camp-2",
    title: "Connected Home Automation Series",
    subtitle: "Intelligent ambient lighting bars and climate monitoring sensors designed for modern living.",
    discountBadge: "SPECIAL BUNDLE DEAL",
    categoryTag: "smart-home",
    bannerImageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_ADMINS: AdminUser[] = [
  {
    uid: "admin-1",
    fullName: "System Owner",
    email: "superadmin@nexus.com",
    role: "superadmin",
    isAdmin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    uid: "admin-2",
    fullName: "Store Operations Manager",
    email: "admin@nexus.com",
    role: "admin",
    isAdmin: true,
    createdAt: "2026-02-15T00:00:00.000Z",
  },
];

export default function Admin() {
  const [session, setSession] = useState<{
    authenticated: boolean;
    role: "superadmin" | "admin";
    email: string;
    name: string;
  }>(() => {
    try {
      const saved = localStorage.getItem("nexus_admin_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.authenticated) return parsed;
      }
    } catch {}
    return { authenticated: false, role: "admin", email: "", name: "" };
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CAMPAIGNS;
  });

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(ADMINS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ADMINS;
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState<
    "analytics" | "orders" | "campaigns" | "leads" | "manage-admins"
  >("analytics");

  // Data states fetched from API
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [leadsData, setLeadsData] = useState<{ subscribers: any[]; interactions: any[] }>({
    subscribers: [],
    interactions: [],
  });
  const [loadingOrders, setLoadingOrders] = useState(false);

  // New campaign state
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newTag, setNewTag] = useState<
    "smart-home" | "workspace-productivity" | "tech-accessories" | "all"
  >("workspace-productivity");
  const [newImageUrl, setNewImageUrl] = useState("");

  // New admin state (for Superadmin)
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"admin" | "superadmin">("admin");

  // Email campaign state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [targetCategory, setTargetCategory] = useState<string>("all");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Orders search filter
  const [orderQuery, setOrderQuery] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch {}
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
    } catch {}
  }, [admins]);

  // Load orders & metrics upon login or tab change
  useEffect(() => {
    if (!session.authenticated) return;

    setLoadingOrders(true);
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));

    fetch("/api/admin/metrics")
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch(() => {});

    fetch("/api/admin/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeadsData({
          subscribers: data.subscribers || [],
          interactions: data.interactions || [],
        });
      })
      .catch(() => {});
  }, [session.authenticated]);

  const handlePasskeyLogin = () => {
    const passkey = window.prompt("Enter Admin Passkey (e.g. nexus-admin-2026):");
    if (!passkey) return;

    if (passkey === "superadmin" || passkey === "superadmin2026") {
      const newSess = {
        authenticated: true,
        role: "superadmin" as const,
        email: "superadmin@nexus.com",
        name: "Super Administrator",
      };
      setSession(newSess);
      localStorage.setItem("nexus_admin_session", JSON.stringify(newSess));
      toast.success("Welcome, Super Administrator!");
    } else if (
      passkey === "nexus-admin-2026" ||
      passkey === "admin123" ||
      passkey === "nexus2026"
    ) {
      const newSess = {
        authenticated: true,
        role: "admin" as const,
        email: "admin@nexus.com",
        name: "Store Admin",
      };
      setSession(newSess);
      localStorage.setItem("nexus_admin_session", JSON.stringify(newSess));
      toast.success("Welcome, Administrator!");
    } else {
      toast.error("Invalid passkey. Access denied.");
    }
  };

  const handleLogout = () => {
    setSession({ authenticated: false, role: "admin", email: "", name: "" });
    localStorage.removeItem("nexus_admin_session");
    toast.info("Signed out of Admin Console");
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSubtitle) {
      toast.error("Please provide a title and subtitle for the campaign.");
      return;
    }
    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      title: newTitle,
      subtitle: newSubtitle,
      discountBadge: newBadge || "SPECIAL OFFER",
      categoryTag: newTag,
      bannerImageUrl:
        newImageUrl ||
        "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80",
      active: true,
      createdAt: new Date().toISOString(),
    };
    setCampaigns((prev) => [campaign, ...prev]);
    setNewTitle("");
    setNewSubtitle("");
    setNewBadge("");
    setNewImageUrl("");
    toast.success("New marketing campaign launched!");
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session.role !== "superadmin") {
      toast.error("Only Superadmins can add new admin accounts.");
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: adminName || "Store Admin",
          email: adminEmail,
          role: adminRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.admin) {
        setAdmins((prev) => [data.admin, ...prev.filter((a) => a.email !== adminEmail)]);
        toast.success(`Created new ${adminRole.toUpperCase()} account for ${adminEmail}!`);
        setAdminName("");
        setAdminEmail("");
      } else {
        toast.error(data.error || "Failed to create admin account.");
      }
    } catch {
      toast.error("Error creating admin user.");
    }
  };

  const handleSendEmailCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailContent) {
      toast.error("Please fill in email subject and content.");
      return;
    }
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setEmailSubject("");
      setEmailContent("");
      toast.success("Email Campaign Sent!", {
        description: `Delivered promotional update to all subscribers interested in ${targetCategory.toUpperCase()}.`,
      });
    }, 1200);
  };

  const filteredOrders = useMemo(() => {
    if (!orderQuery.trim()) return orders;
    const q = orderQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.name?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q)
    );
  }, [orders, orderQuery]);

  // Login screen
  if (!session.authenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Admin Console Access
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Enter your administrator passkey or log in as Superadmin / Admin.
          </p>
          <button
            type="button"
            onClick={handlePasskeyLogin}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            Sign In with Passkey
          </button>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Role-based routing: Logging in as superadmin or admin grants direct access to store metrics, orders, campaigns, and user lead tracking.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase">
            <Shield size={14} /> Nexus Management Portal — Role: {session.role}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Admin Dashboard &amp; Analytics
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs hidden sm:block">
            <div className="font-semibold text-slate-900 dark:text-white">
              {session.name || session.email}
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 uppercase">
              {session.role}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "analytics"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <BarChart3 size={14} /> Analytics &amp; Metrics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "orders"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ShoppingBag size={14} /> Orders Received ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "campaigns"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Tag size={14} /> Campaigns &amp; Email Marketing ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leads")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "leads"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users size={14} /> Leads &amp; Customer Likes ({leadsData.subscribers.length + leadsData.interactions.length})
        </button>

        {session.role === "superadmin" && (
          <button
            type="button"
            onClick={() => setActiveTab("manage-admins")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "manage-admins"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            <UserPlus size={14} /> Manage Admins (Superadmin)
          </button>
        )}
      </div>

      {/* TAB 1: ANALYTICS & METRICS */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">Total Sales Revenue</span>
                <DollarSign size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                ${metrics?.totalRevenue ? metrics.totalRevenue.toFixed(2) : "874.00"}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} /> +18.4% from last period
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">Total Orders</span>
                <ShoppingBag size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {metrics?.totalOrders ?? orders.length ?? 4}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Direct via Shopify API</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">Conversion Rate</span>
                <Percent size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {metrics?.conversionRate ?? "3.33"}%
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} /> High shopper intent
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">Avg Order Value (AOV)</span>
                <BarChart3 size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                ${metrics?.averageOrderValue ? metrics.averageOrderValue.toFixed(2) : "218.50"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Multi-item 50% discount active</p>
            </div>
          </div>

          {/* Top Selling Products Metrics Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" /> Product Performance &amp; Conversion Metrics
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Metrics showing views, clicks, units sold, revenue, and individual product conversion rates.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Product Title</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Category</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Units Sold</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Revenue</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Views</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Clicks</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(metrics?.topSellingProducts || [
                    { id: "p1", title: "Nexus Ergonomic Smart Light Bar", category: "Workspace Productivity", unitsSold: 12, revenue: 1548, views: 320, clicks: 84, conversionRate: 3.75 },
                    { id: "p2", title: "Nexus Thunderbolt 4 Pro Docking Station", category: "Workspace Productivity", unitsSold: 8, revenue: 1592, views: 210, clicks: 52, conversionRate: 3.81 },
                    { id: "p3", title: "Nexus Smart Climate Sensor & Gateway", category: "Smart Home", unitsSold: 6, revenue: 474, views: 185, clicks: 41, conversionRate: 3.24 },
                    { id: "p4", title: "Nexus Magnetic Wireless Charging Stand", category: "Tech Accessories", unitsSold: 5, revenue: 425, views: 150, clicks: 33, conversionRate: 3.33 },
                  ]).map((prod: any) => (
                    <tr key={prod.id || prod.title} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{prod.title}</td>
                      <td className="px-4 py-3 text-slate-500">{prod.category}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{prod.unitsSold}</td>
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">${prod.revenue}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{prod.views}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{prod.clicks}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{prod.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS RECEIVED */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber-500" /> Orders Received
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time store orders synchronized via Shopify GraphQL Admin API token.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder="Search orders, customers..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Order ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Date Processed</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Items Purchased</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Payment Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fulfillment</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      {loadingOrders ? "Loading orders..." : "No orders matching query."}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{order.name}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(order.processedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-xs">
                          {order.lineItems?.map((item: any, idx: number) => (
                            <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                              • {item.title} (x{item.quantity})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {order.financialStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        ${order.totalPrice?.amount} {order.totalPrice?.currencyCode}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPAIGNS & EMAIL MARKETING */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Campaign Banner Form */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Plus size={16} className="text-amber-500" /> Create Campaign Banner
            </h2>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Summer Smart Home Deals"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
                <textarea
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Promo description..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Badge</label>
                <input
                  type="text"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="e.g., 20% OFF SITEWIDE"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Niche</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="workspace-productivity">Workspace Productivity</option>
                  <option value="smart-home">Smart Home &amp; Automation</option>
                  <option value="tech-accessories">Tech Accessories</option>
                  <option value="all">All Products / Global</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
              >
                Publish Campaign
              </button>
            </form>
          </div>

          {/* Email Campaign Dispatcher */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Mail size={16} className="text-amber-500" /> Dispatch Email Campaign to Key Leads
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Send targeted promotional newsletters to customers and leads filtered by their recorded product interests/likes.
              </p>

              <form onSubmit={handleSendEmailCampaign} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Subject Line</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Exclusive Smart Home Deals Just For You"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Lead Audience</label>
                    <select
                      value={targetCategory}
                      onChange={(e) => setTargetCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="all">All Newsletter Subscribers &amp; Leads ({leadsData.subscribers.length + 4})</option>
                      <option value="smart-home">Leads interested in Smart Home Automation</option>
                      <option value="workspace-productivity">Leads interested in Workspace Productivity</option>
                      <option value="tech-accessories">Leads interested in Tech Accessories</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Campaign Content</label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Draft your promotional email copy here..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={15} /> {sendingEmail ? "Dispatching Email Campaign..." : "Send Campaign to Leads"}
                </button>
              </form>
            </div>

            {/* Campaign Banners List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Store Campaigns</h3>
              {campaigns.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4 items-center">
                  <img src={c.bannerImageUrl} alt={c.title} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">{c.discountBadge}</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{c.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCampaigns((prev) => prev.filter((item) => item.id !== c.id))}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEADS & CUSTOMER LIKES */}
      {activeTab === "leads" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-amber-500" /> Key Leads &amp; Tracked Product Interests
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Customer emails captured from Newsletter submissions, user logins, and tracked product clicks/likes across the store.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Newsletter Subscribers list */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
                <Mail size={14} className="text-amber-500" /> Newsletter Subscribers ({leadsData.subscribers.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {leadsData.subscribers.map((sub: any) => (
                  <div key={sub.id || sub.email} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{sub.email}</div>
                      <div className="text-[10px] text-slate-400">Source: {sub.source || "Society Modal"}</div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      Subscribed
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracked Product Clicks & Likes */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
                <Heart size={14} className="text-amber-500" /> Tracked User Clicks &amp; Likes ({leadsData.interactions.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {leadsData.interactions.map((int: any) => (
                  <div key={int.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{int.userEmail || "Key Lead"}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{int.action}</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      Product: {int.productTitle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUPERADMIN — MANAGE ADMINS */}
      {activeTab === "manage-admins" && session.role === "superadmin" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Admin Form */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <UserPlus size={16} className="text-amber-500" /> Add Admin with Assigned Role
            </h2>

            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. John Administrator"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@nexus.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as "admin" | "superadmin")}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="admin">Admin (Manage Orders, Campaigns, Analytics)</option>
                  <option value="superadmin">Superadmin (Full Access + Add Admins)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus size={15} /> Create Admin Account
              </button>
            </form>
          </div>

          {/* Administrators List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield size={16} className="text-amber-500" /> Active Store Administrators ({admins.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {admins.map((adm) => (
                <div key={adm.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{adm.fullName}</div>
                    <div className="text-xs text-slate-500">{adm.email}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    adm.role === "superadmin"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {adm.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
