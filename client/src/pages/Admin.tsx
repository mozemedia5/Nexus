import React, { useState, useEffect, useMemo } from "react";
import { Shield, Plus, Trash2, Tag, Calendar, CheckCircle2, AlertCircle, Users, Heart, Eye, ArrowUpRight, LogOut } from "lucide-react";
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

const CAMPAIGNS_STORAGE_KEY = "nexus_admin_campaigns_v1";
const CUSTOMERS_STORAGE_KEY = "nexus_customers_v1";

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

// Default demo customers for the tracking table
const DEFAULT_CUSTOMERS = [
  { id: "1", name: "Sarah Mitchell", email: "sarah@example.com", loginMethod: "Google", lastActive: "2026-09-08", likes: ["Smart Light Bar", "Climate Monitor"], status: "active" },
  { id: "2", name: "James Cooper", email: "james@example.com", loginMethod: "Email", lastActive: "2026-09-07", likes: ["Thunderbolt Dock"], status: "active" },
  { id: "3", name: "Aisha Patel", email: "aisha@example.com", loginMethod: "Apple", lastActive: "2026-09-09", likes: ["Wireless Charger", "Light Strip", "Headphones"], status: "active" },
  { id: "4", name: "David Kim", email: "david@example.com", loginMethod: "Google", lastActive: "2026-09-05", likes: ["Ergonomic Desk Light"], status: "inactive" },
];

function getStoredCustomers() {
  try {
    const saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_CUSTOMERS;
}

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

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("nexus_admin_session") === "true";
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CAMPAIGNS;
  });

  const [customers, setCustomers] = useState(getStoredCustomers);

  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newTag, setNewTag] = useState<"smart-home" | "workspace-productivity" | "tech-accessories" | "all">("workspace-productivity");
  const [newImageUrl, setNewImageUrl] = useState("");

  const [activeTab, setActiveTab] = useState<"campaigns" | "customers">("campaigns");

  useEffect(() => {
    try {
      localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch {}
  }, [campaigns]);

  const handleLogin = () => {
    const passkey = window.prompt("Enter Admin Passkey:");
    if (passkey === "nexus-admin-2026" || passkey === "admin123" || passkey === "nexus2026") {
      setIsAuthenticated(true);
      localStorage.setItem("nexus_admin_session", "true");
      toast.success("Welcome, Administrator!");
    } else if (passkey) {
      toast.error("Invalid passkey. Access denied.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("nexus_admin_session");
    toast.info("Signed out of Admin Portal");
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
      bannerImageUrl: newImageUrl || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80",
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

  const toggleCampaignStatus = (id: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
    toast.info("Campaign status updated");
  };

  const deleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  };

  // Login page - unified login, not a separate admin portal
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Admin Access</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Enter your admin passkey to manage campaigns and track customers.
          </p>
          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            Sign In
          </button>
          <p className="text-[11px] text-slate-400 mt-4">
            Admin passkey is set by the store owner. Customers log in via Google, Apple, or Email on the main site.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
        <div>
          <span className="text-xs font-semibold tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Shield size={14} /> Nexus Admin Console
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Campaign &amp; Customer Manager
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start sm:self-auto px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "campaigns" ? "bg-amber-500 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          Campaigns ({campaigns.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${activeTab === "customers" ? "bg-amber-500 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
        >
          <Users size={13} /> Customers ({customers.length})
        </button>
      </div>

      {activeTab === "campaigns" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Campaign Form */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Plus size={16} className="text-amber-500" /> Create Campaign
            </h2>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Campaign Title</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Summer Smart Home Deals" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle / Description</label>
                <textarea value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="Brief campaign promo message..." rows={3} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Badge Text</label>
                <input type="text" value={newBadge} onChange={(e) => setNewBadge(e.target.value)} placeholder="e.g., 25% OFF SITEWIDE" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Niche</label>
                <select value={newTag} onChange={(e) => setNewTag(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  <option value="workspace-productivity">Workspace Productivity</option>
                  <option value="smart-home">Smart Home & Automation</option>
                  <option value="tech-accessories">Tech Accessories</option>
                  <option value="all">All Products / Global</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banner Image URL</label>
                <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors">
                Publish Campaign
              </button>
            </form>
          </div>

          {/* Campaign List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Active Store Campaigns ({campaigns.length})</span>
            </h2>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row">
                  <div className="sm:w-1/3 relative min-h-[100px]">
                    <img src={campaign.bannerImageUrl} alt={campaign.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md">{campaign.discountBadge}</span>
                  </div>
                  <div className="sm:w-2/3 p-4 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">Niche: {campaign.categoryTag}</span>
                        <button type="button" onClick={() => toggleCampaignStatus(campaign.id)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${campaign.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          {campaign.active ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {campaign.active ? "ACTIVE" : "INACTIVE"}
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{campaign.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{campaign.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <span>Launched: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      <button type="button" onClick={() => deleteCampaign(campaign.id)} className="text-rose-500 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Delete campaign">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Customer Tracking Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-amber-500" /> Customer Activity &amp; Likes
            </h2>
            <p className="text-xs text-slate-500 mt-1">Track logged-in users, their authentication method, and product interests.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Login Method</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Last Active</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Liked Products</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{customer.name}</div>
                      <div className="text-[11px] text-slate-500">{customer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        customer.loginMethod === "Google" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                        customer.loginMethod === "Apple" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        {customer.loginMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{customer.lastActive}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.likes.map((like: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">
                            <Heart size={9} className="fill-current" /> {like}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                        <Eye size={9} /> {customer.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
