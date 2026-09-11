import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Mail,
  Send,
  Trash2,
  Tag,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CAMPAIGNS, type Campaign } from "@/pages/Admin";

const CAMPAIGNS_STORAGE_KEY = "nexus_admin_campaigns_v1";

export default function AdminCampaigns() {
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
  const [newTag, setNewTag] = useState<
    "smart-home" | "workspace-productivity" | "tech-accessories" | "all"
  >("workspace-productivity");
  const [newImageUrl, setNewImageUrl] = useState("");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [targetCategory, setTargetCategory] = useState("all");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch {}
  }, [campaigns]);

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
    toast.success("New promotional campaign published!");
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
        description: `Delivered update to all subscribers interested in ${targetCategory.toUpperCase()}.`,
      });
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <Megaphone size={14} /> Marketing Portal
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Promotions &amp; Targeted Email Campaigns
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Create homepage campaign banners and dispatch customized email updates to interested leads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Campaign Banner */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus size={16} className="text-amber-400" /> Create Campaign Banner
          </h2>

          <form onSubmit={handleCreateCampaign} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Campaign Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Smart Office Elevation Event"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Subtitle</label>
              <textarea
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Campaign description..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Discount Badge</label>
              <input
                type="text"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                placeholder="e.g. SAVE UP TO 20%"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Target Category</label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="workspace-productivity">Workspace Productivity</option>
                <option value="smart-home">Smart Home &amp; Automation</option>
                <option value="tech-accessories">Tech Accessories</option>
                <option value="all">Global Storewide</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Publish Campaign
            </button>
          </form>
        </div>

        {/* Email Dispatcher & Active Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email Dispatcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail size={16} className="text-amber-400" /> Targeted Email Campaign Dispatcher
            </h2>
            <p className="text-xs text-slate-400">
              Send personalized email announcements based on recorded customer product interest scores.
            </p>

            <form onSubmit={handleSendEmailCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Exclusive Smart Home Upgrade"
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Audience Filter</label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="all">All Subscribers &amp; Captured Leads</option>
                    <option value="smart-home">Leads interested in Smart Home</option>
                    <option value="workspace-productivity">Leads interested in Workspace Productivity</option>
                    <option value="tech-accessories">Leads interested in Tech Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Body Copy</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Draft your promotional newsletter message here..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingEmail}
                className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} /> {sendingEmail ? "Sending..." : "Dispatch Email Campaign"}
              </button>
            </form>
          </div>

          {/* Active Campaigns List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Active Campaigns ({campaigns.length})</h3>
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <img src={c.bannerImageUrl} alt={c.title} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">{c.discountBadge}</span>
                  <h4 className="font-bold text-xs text-white truncate">{c.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{c.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCampaigns((prev) => prev.filter((i) => i.id !== c.id))}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete campaign"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
