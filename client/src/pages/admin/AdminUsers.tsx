import { useEffect, useMemo, useState } from "react";
import { Users, Search, Mail, Package, Clock3 } from "lucide-react";
import { getAdminAuthHeaders } from "@/lib/firebase";

export interface TrackedUser {
  id: string;
  fullName: string;
  email: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  primaryInterest: string;
  productInterests?: string[];
  searchedKeywords: string[];
  likedProducts: string[];
  lastActive: string;
}

function formatActive(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently active" : date.toLocaleString();
}

export default function AdminUsers() {
  const [users, setUsers] = useState<TrackedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setLoading(true);
      try {
        const headers = await getAdminAuthHeaders();
        const response = await fetch("/api/admin/users", { headers });
        const data = await response.json();
        if (!cancelled && response.ok && Array.isArray(data.users)) setUsers(data.users);
      } catch {}
      if (!cancelled) setLoading(false);
    }
    void loadUsers();
    return () => { cancelled = true; };
  }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const haystack = `${user.fullName} ${user.email} ${user.primaryInterest} ${(user.productInterests || user.searchedKeywords || []).join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [users, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
            <Users size={14} /> Customer emails &amp; product interests
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Customer activity</h1>
          <p className="text-xs text-slate-400 mt-1">Verified sign-ins, newsletter subscribers, and products shoppers viewed or added to cart.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email or product…"
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white placeholder-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
            {loading ? "Loading customer activity…" : "No customers or leads found yet. Verified sign-ins, newsletter subscriptions, and identified product interests will appear here."}
          </div>
        ) : filteredUsers.map((user) => {
          const interests = user.productInterests || user.searchedKeywords || [];
          return (
            <article key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-base font-extrabold text-white">
                    {user.fullName || user.email.split("@")[0]}
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">{user.primaryInterest}</span>
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-300 break-all"><Mail size={13} className="shrink-0 text-amber-400" />{user.email}</div>
                </div>
                <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300"><Package size={13} className="mr-1 inline" />{user.totalOrders || 0} orders</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 size={13} /> Last activity: {formatActive(user.lastActive)}</div>

              <div className="border-t border-slate-800 pt-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Products of interest</div>
                {interests.length ? (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((product, index) => <span key={`${product}-${index}`} className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200">{product}</span>)}
                  </div>
                ) : <p className="text-xs text-slate-500">No product activity has been recorded for this email yet.</p>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
