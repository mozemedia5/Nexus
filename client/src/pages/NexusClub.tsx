import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Award,
  ShoppingBag,
  Star,
  MessageSquare,
  Share2,
  Tag,
  ShieldCheck,
  Zap,
  Gift,
  Plus,
  Send,
  ThumbsUp,
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Package,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface Review {
  id: string;
  authorName: string;
  authorEmail: string;
  productName: string;
  rating: number;
  comment: string;
  createdAt: string;
  likes: number;
  verifiedPurchase: boolean;
}

interface CommunityPost {
  id: string;
  authorName: string;
  title: string;
  category: "Setup Share" | "Tip & Trick" | "Feature Request";
  content: string;
  createdAt: string;
  likes: number;
}

const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    authorName: "Marcus Vance",
    authorEmail: "marcus@example.com",
    productName: "Nexus Smart Ambient LED Bar",
    rating: 5,
    comment: "The synchronized ambient lighting completely elevated my dual-monitor setup! Unbelievable response time and seamless integration.",
    createdAt: "2025-02-14T10:30:00.000Z",
    likes: 18,
    verifiedPurchase: true,
  },
  {
    id: "rev-2",
    authorName: "Elena Rostova",
    authorEmail: "elena@example.com",
    productName: "Nexus Ergonomic Magnetic Desk Pad",
    rating: 5,
    comment: "The feel of high-grade vegan leather under wrists is supreme. Keeps my wireless chargers locked in place perfectly.",
    createdAt: "2025-02-10T14:15:00.000Z",
    likes: 24,
    verifiedPurchase: true,
  },
  {
    id: "rev-3",
    authorName: "David Chen",
    authorEmail: "david@example.com",
    productName: "Nexus Ultra-Fast GaN Desktop Charger 140W",
    rating: 5,
    comment: "Powers my MacBook Pro, iPad Pro, and iPhone simultaneously without getting warm. Essential for workspace decluttering.",
    createdAt: "2025-01-28T09:00:00.000Z",
    likes: 12,
    verifiedPurchase: true,
  },
];

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "post-1",
    authorName: "Sarah Jenkins",
    title: "Minimalist Ergonomic Workspace Guide 2026",
    category: "Setup Share",
    content: "Combining the Nexus Ambient Light Bar with the GaN 140W charger eliminated 4 unnecessary wall adapters. My desk cable management is 100% hidden now!",
    createdAt: "2025-02-12T16:00:00.000Z",
    likes: 31,
  },
  {
    id: "post-2",
    authorName: "Liam O'Connor",
    title: "Pro Tip: Custom Automation Triggers for Nexus Smart Home",
    category: "Tip & Trick",
    content: "Set up your smart desk lighting to shift to warm amber at 6:00 PM to signal wrap-up time. Works wonders for focus and circadian rhythm.",
    createdAt: "2025-02-05T11:20:00.000Z",
    likes: 19,
  },
];

export default function NexusClub() {
  const [, setLocation] = useLocation();

  // Authentication & Membership check state
  const [memberInfo, setMemberInfo] = useState<{
    email: string;
    name: string;
    joinedVia: "Newsletter" | "Signed Account";
  } | null>(null);

  // Gating input state for non-members
  const [gateEmail, setGateEmail] = useState("");

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"perks" | "reviews" | "community" | "purchases">("perks");

  // Community & Review state
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_club_reviews_v1");
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_club_posts_v1");
      return saved ? JSON.parse(saved) : INITIAL_COMMUNITY_POSTS;
    } catch {
      return INITIAL_COMMUNITY_POSTS;
    }
  });

  // Review Form state
  const [newProdName, setNewProdName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  // Post Form state
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<"Setup Share" | "Tip & Trick" | "Feature Request">("Setup Share");
  const [newPostContent, setNewPostContent] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const userProfile = localStorage.getItem("nexus_user_profile");
      if (userProfile) {
        try {
          const parsed = JSON.parse(userProfile);
          setMemberInfo({
            email: parsed.email || "member@nexus.com",
            name: parsed.name || parsed.email?.split("@")[0] || "Nexus Member",
            joinedVia: "Signed Account",
          });
          return;
        } catch {}
      }

      const isNewsletterMember = localStorage.getItem("nexus_club_member_v1") === "true";
      const newsletterEmail = localStorage.getItem("nexus_club_member_email");
      if (isNewsletterMember) {
        setMemberInfo({
          email: newsletterEmail || "clubmember@nexus.com",
          name: newsletterEmail ? newsletterEmail.split("@")[0] : "Nexus Club Member",
          joinedVia: "Newsletter",
        });
        return;
      }

      setMemberInfo(null);
    };

    checkAuth();
    window.addEventListener("nexus-member-updated", checkAuth);
    return () => window.removeEventListener("nexus-member-updated", checkAuth);
  }, []);

  const handleGateJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = gateEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    localStorage.setItem("nexus_club_member_v1", "true");
    localStorage.setItem("nexus_club_member_email", cleanEmail);
    window.dispatchEvent(new CustomEvent("nexus-member-updated"));

    toast.success("Welcome to Nexus Club!", {
      description: "Access unlocked. Explore member perks, community reviews, and product drops.",
    });
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newComment.trim()) {
      toast.error("Please provide both product name and review comment.");
      return;
    }

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      authorName: memberInfo?.name || "Verified Member",
      authorEmail: memberInfo?.email || "",
      productName: newProdName.trim(),
      rating: newRating,
      comment: newComment.trim(),
      createdAt: new Date().toISOString(),
      likes: 1,
      verifiedPurchase: true,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem("nexus_club_reviews_v1", JSON.stringify(updated));

    toast.success("Review published to Nexus Club!");
    setNewProdName("");
    setNewComment("");
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error("Please fill in both title and post content.");
      return;
    }

    const newP: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: memberInfo?.name || "Nexus Member",
      title: newPostTitle.trim(),
      category: newPostCategory,
      content: newPostContent.trim(),
      createdAt: new Date().toISOString(),
      likes: 1,
    };

    const updated = [newP, ...communityPosts];
    setCommunityPosts(updated);
    localStorage.setItem("nexus_club_posts_v1", JSON.stringify(updated));

    toast.success("Discussion post published!");
    setNewPostTitle("");
    setNewPostContent("");
  };

  const handleLikeReview = (id: string) => {
    const updated = reviews.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r));
    setReviews(updated);
    localStorage.setItem("nexus_club_reviews_v1", JSON.stringify(updated));
    toast.success("Liked review!");
  };

  const handleLikePost = (id: string) => {
    const updated = communityPosts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p));
    setCommunityPosts(updated);
    localStorage.setItem("nexus_club_posts_v1", JSON.stringify(updated));
    toast.success("Liked discussion post!");
  };

  // Gatekeeper View for non-members
  if (!memberInfo) {
    return (
      <>
        <SEO
          title="Nexus Club — Member Exclusive Community & Perks"
          description="Join Nexus Club for early access to product releases, member discounts, and community reviews."
          canonicalPath="/nexus-club"
        />
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Award size={36} />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Members Only Hub
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3">
              Unlock The Nexus Club
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
              Access product reviews, setup sharing, order history, early access gadget drops, and exclusive 15% member perks.
            </p>

            <form onSubmit={handleGateJoin} className="space-y-4 max-w-md mx-auto">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  placeholder="Enter your email to unlock..."
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-sm rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Unlock Nexus Club Free</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Already registered on Nexus?</span>
              <Link href="/login" className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1">
                <User size={14} /> Sign In to Account <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Nexus Club — Member Hub & Community"
        description="Nexus Club member dashboard featuring community product reviews, order benefits, and workspace innovation discussions."
        canonicalPath="/nexus-club"
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Member Banner Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <Award size={280} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Award size={14} /> Verified {memberInfo.joinedVia} Status
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Welcome back, {memberInfo.name}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Logged in as <span className="text-amber-400 font-mono">{memberInfo.email}</span>. You have active Nexus VIP member privileges.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Member Savings</span>
                  <span className="text-2xl font-black text-amber-400">15% OFF</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Reward Points</span>
                  <span className="text-2xl font-black text-white">450 PTS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hub Navigation Tabs */}
          <div className="flex items-center justify-start gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2">
            {[
              { id: "perks", label: "Member Perks & Promo", icon: Gift },
              { id: "reviews", label: `Product Reviews (${reviews.length})`, icon: Star },
              { id: "community", label: `Setup Discussions (${communityPosts.length})`, icon: MessageSquare },
              { id: "purchases", label: "My Bought Products", icon: ShoppingBag },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: PERKS & EXCLUSIVES */}
          {activeTab === "perks" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                    <Tag size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">VIP Promo Code</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                    Use code at checkout for an extra 15% off smart office setups.
                  </p>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-between font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    <span>NEXUS-CLUB-15</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("NEXUS-CLUB-15");
                        toast.success("Promo code copied to clipboard!");
                      }}
                      className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-xl text-xs font-sans hover:bg-amber-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Early Access Drops</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                    Get 48-hour priority access to limited edition smart desk hardware.
                  </p>
                  <span className="inline-block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    • Active Status Guaranteed
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Extended Warranty</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                    All purchases made by Nexus Club members automatically include 2-year express support.
                  </p>
                  <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    • Complimentary for Members
                  </span>
                </div>
              </div>

              {/* Recommended Member Products Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Curated Member Recommendations
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Smart home &amp; workspace items trending in Nexus Club.
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {[
                    {
                      name: "Nexus Smart Ambient LED Bar",
                      price: "$89.00 USD",
                      category: "Smart Home",
                      link: "/products",
                    },
                    {
                      name: "Nexus Ergonomic Desk Pad",
                      price: "$45.00 USD",
                      category: "Workspace Productivity",
                      link: "/products",
                    },
                    {
                      name: "Nexus Ultra GaN Charger 140W",
                      price: "$79.00 USD",
                      category: "Tech Accessories",
                      link: "/products",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                          {item.name}
                        </h4>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                          {item.price}
                        </div>
                      </div>

                      <Link
                        href={item.link}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl text-center transition-colors"
                      >
                        Shop Member Exclusive
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT REVIEWS */}
          {activeTab === "reviews" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form to post review */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500" /> Share Product Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review a product you bought from Nexus Store to earn 50 reward points.
                </p>

                <form onSubmit={handleAddReview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Nexus Smart Ambient LED Bar"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rating Score
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            size={20}
                            className={
                              star <= newRating
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-300 dark:text-slate-700"
                            }
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-500">{newRating} / 5 Stars</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Review Thoughts
                    </label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="How has this gadget improved your daily smart home or desktop flow?"
                      rows={4}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Submit Member Review
                  </button>
                </form>
              </div>

              {/* Reviews List */}
              <div className="lg:col-span-2 space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold text-xs flex items-center justify-center">
                          {rev.authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{rev.authorName}</span>
                            {rev.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> Verified Buyer
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rev.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i < rev.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-300 dark:text-slate-700"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Product: {rev.productName}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      "{rev.comment}"
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <span>Shared in Nexus Club Reviews</span>
                      <button
                        type="button"
                        onClick={() => handleLikeReview(rev.id)}
                        className="flex items-center gap-1.5 hover:text-amber-500 transition-colors font-semibold"
                      >
                        <ThumbsUp size={12} /> Helpful ({rev.likes})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNITY DISCUSSIONS */}
          {activeTab === "community" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Post Creation Form */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-amber-500" /> Start Discussion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share your workspace setup, tips, or product feedback with fellow Nexus members.
                </p>

                <form onSubmit={handleAddPost} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newPostCategory}
                      onChange={(e) => setNewPostCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Setup Share">Setup Share</option>
                      <option value="Tip & Trick">Tip &amp; Trick</option>
                      <option value="Feature Request">Feature Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      placeholder="e.g. My Clean Desk Setup 2026"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Post Content
                    </label>
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Describe your ideas, cable organization, or smart home routines..."
                      rows={5}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Post Discussion
                  </button>
                </form>
              </div>

              {/* Discussions List */}
              <div className="lg:col-span-2 space-y-4">
                {communityPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                        {post.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {post.content}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Posted by {post.authorName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        <ThumbsUp size={12} /> Like ({post.likes})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MY BOUGHT PRODUCTS */}
          {activeTab === "purchases" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package size={20} className="text-amber-500" /> Products Purchased &amp; Order History
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    View your verified product purchases linked to email <span className="font-mono text-amber-600 dark:text-amber-400">{memberInfo.email}</span>.
                  </p>
                </div>

                <Link
                  href="/track-order"
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <ShoppingBag size={14} /> Live Order Tracking
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  {
                    orderNo: "#NX-88219",
                    date: "Feb 14, 2026",
                    status: "Delivered",
                    items: [
                      { title: "Nexus Smart Ambient LED Bar", price: "$89.00 USD" },
                      { title: "Nexus Ergonomic Desk Pad", price: "$45.00 USD" },
                    ],
                  },
                ].map((ord, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Order {ord.orderNo}</span>
                        <span className="text-[10px] text-slate-400 font-normal">• {ord.date}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {ord.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ord.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{it.title}</span>
                          <span className="font-mono text-slate-500">{it.price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("reviews");
                          setNewProdName(ord.items[0].title);
                        }}
                        className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-600 transition-colors"
                      >
                        Write Review &amp; Share Setup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
