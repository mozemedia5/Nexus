import React, { useState, useEffect } from "react";
import { Shield, Lock, Mail, Key, LogIn, Plus, Trash2, Tag, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CAMPAIGNS;
  });

  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newTag, setNewTag] = useState<"smart-home" | "workspace-productivity" | "tech-accessories" | "all">("workspace-productivity");
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch {}
  }, [campaigns]);

  const handleOAuthLogin = (provider: string) => {
    const defaultPasskey = "nexus-admin-2026";
    const userPasskey = window.prompt(`Enter Security Admin Passkey for ${provider} authentication:`);
    if (!userPasskey) {
      toast.error("Authentication canceled. Admin passkey required.");
      return;
    }
    if (userPasskey.trim() === defaultPasskey) {
      setIsAuthenticated(true);
      localStorage.setItem("nexus_admin_session", "true");
      toast.success(`Successfully authenticated with ${provider} Admin Access`);
    } else {
      toast.error("Invalid Admin Passkey. Access denied.");
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and passkey/password.");
      return;
    }
    const defaultPasskey = "nexus-admin-2026";
    if (password === defaultPasskey || password === "admin123" || password === "nexus2026") {
      setIsAuthenticated(true);
      localStorage.setItem("nexus_admin_session", "true");
      toast.success("Welcome, Administrator!");
    } else {
      toast.error("Invalid administrator password or passkey.");
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
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
    toast.info("Campaign status updated");
  };

  const deleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Portal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sign in to manage campaigns and platform settings
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthLogin("Google")}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("Apple")}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-medium text-sm transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.71.13-9.56-1.92-14.54-6.14-3.26-2.76-7.14-7.42-11.64-13.99-6.3-9.17-11.39-19.82-15.28-31.96-3.89-12.14-5.83-23.71-5.83-34.7 0-14.28 3.59-25.99 10.77-35.13 7.18-9.14 16.31-13.82 27.39-14.04 4.86 0 10.12 1.18 15.77 3.55 5.66 2.37 9.4 3.55 11.23 3.55 1.58 0 5.48-1.22 11.7-3.67 6.22-2.44 11.53-3.58 15.93-3.41 11.96.53 21.68 4.88 29.16 13.06-10.65 6.44-15.83 15.34-15.54 26.7 0 9.87 3.82 18.06 11.46 24.57 5.02 4.28 10.7 7.02 17.03 8.22-2.64 7.63-6.08 15.01-10.33 22.14z" />
                <path d="M119.22 31.08c0-7.01 2.53-13.87 7.59-20.58 5.06-6.71 11.45-10.5 19.17-11.37.13 1.05.2 2.01.2 2.89 0 6.9-2.6 13.84-7.8 20.82-5.2 6.98-11.66 10.73-19.38 11.24-.13-.92-.2-1.92-.2-3z" />
              </svg>
              Sign in with Apple
            </button>
          </div>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-slate-900 text-xs text-slate-400 uppercase tracking-wider">
              Or with Email
            </span>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexusstore.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Shield size={14} /> Nexus Admin Console
          </span>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Campaign & Advertising Manager
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start sm:self-auto px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Campaign Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Plus size={18} className="text-amber-500" /> Create Campaign
          </h2>

          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campaign Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Summer Smart Home Deals"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subtitle / Description
              </label>
              <textarea
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Brief campaign promo message..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount Badge Text
              </label>
              <input
                type="text"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                placeholder="e.g., 25% OFF SITEWIDE"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Niche
              </label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="workspace-productivity">Workspace Productivity</option>
                <option value="smart-home">Smart Home & Automation</option>
                <option value="tech-accessories">Tech Accessories</option>
                <option value="all">All Products / Global</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Banner Image URL
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
            >
              Publish Campaign
            </button>
          </form>
        </div>

        {/* Campaign List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Active Store Campaigns ({campaigns.length})</span>
          </h2>

          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
              >
                <div className="sm:w-1/3 relative min-h-[120px]">
                  <img
                    src={campaign.bannerImageUrl}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md">
                    {campaign.discountBadge}
                  </span>
                </div>

                <div className="sm:w-2/3 p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Niche: {campaign.categoryTag}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCampaignStatus(campaign.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          campaign.active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {campaign.active ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        {campaign.active ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {campaign.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {campaign.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>Launched: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-rose-500 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete campaign"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
