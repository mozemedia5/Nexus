import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  MapPin,
  Heart,
  TrendingUp,
  ArrowRight,
  Mail,
  UserCheck,
} from "lucide-react";
import { Link } from "wouter";

export interface TrackedUser {
  id: string;
  fullName: string;
  email: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  primaryInterest: string;
  smartHomeScore: number;
  workspaceScore: number;
  searchedKeywords: string[];
  likedProducts: string[];
  lastActive: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<TrackedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
            <Users size={14} /> Customer Intelligence &amp; Lead Profiling
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Tracked Users &amp; Product Affinity Scores
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracked customer locations, search queries, liked products, and interest analysis.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, location, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
            {loading ? "Loading tracked store users..." : "No tracked users found. User activity and subscriptions will automatically populate profiles."}
          </div>
        ) : (
          filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  {user.fullName}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {user.primaryInterest}
                  </span>
                </h3>
                <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-amber-400" /> {user.email}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin size={12} className="text-rose-400" /> {user.location}
                  </span>
                </div>
              </div>

              <Link
                href={`/admin/users/${user.id}`}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0"
              >
                <span>View Page</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* Interest Affinity Scores */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Smart Home Score</div>
                <div className="font-extrabold text-amber-400 text-sm">{user.smartHomeScore}%</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Workspace Score</div>
                <div className="font-extrabold text-blue-400 text-sm">{user.workspaceScore}%</div>
              </div>
            </div>

            {/* Searched Keywords & Liked Products */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-300">
                Searched Keywords: <span className="font-normal text-slate-400">{user.searchedKeywords.join(", ")}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-300">
                Liked Products: <span className="font-normal text-amber-300">{user.likedProducts.join(", ")}</span>
              </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
