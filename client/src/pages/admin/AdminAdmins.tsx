import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/pages/Admin";
import { getAdminAuthHeaders } from "@/lib/firebase";

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingUid, setRevokingUid] = useState("");

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAdminAuthHeaders();
      const response = await fetch("/api/admin/admins", { headers, cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { admins?: AdminUser[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load administrator accounts.");
      setAdmins(Array.isArray(payload.admins) ? payload.admins : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load administrator accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAdmins(); }, [loadAdmins]);

  const handleAddAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminEmail.trim() || !adminEmail.includes("@")) {
      toast.error("Please enter a valid Firebase account email.");
      return;
    }
    setSaving(true);
    try {
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ fullName: adminName, email: adminEmail.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { admin?: AdminUser; error?: string };
      if (!response.ok || !payload.admin) throw new Error(payload.error || "Could not promote this Firebase account.");
      setAdmins((previous) => [payload.admin!, ...previous.filter((admin) => admin.uid !== payload.admin!.uid)]);
      toast.success("Verified account promoted to store admin. They must sign in again to receive the new role.");
      setAdminName("");
      setAdminEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error promoting administrator account.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (admin: AdminUser) => {
    if (admin.isBootstrap) return;
    if (!window.confirm(`Revoke administrator access for ${admin.email}? Their active Firebase sessions will be revoked.`)) return;
    setRevokingUid(admin.uid);
    try {
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(admin.uid)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not revoke administrator access.");
      setAdmins((previous) => previous.filter((item) => item.uid !== admin.uid));
      toast.success(`Administrator access revoked for ${admin.email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke administrator access.");
    } finally {
      setRevokingUid("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-slate-800">
        <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <Shield size={14} /> Superadministrator Access Control
        </span>
        <h1 className="text-2xl font-black text-white mt-1">Manage Administrator Accounts</h1>
        <p className="text-xs text-slate-400 mt-1">
          Promote an existing, active Firebase account with a verified email. Administrator roles are assigned by the server, not the browser.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus size={16} className="text-amber-400" /> Promote Firebase User
          </h2>
          <form onSubmit={handleAddAdmin} className="space-y-3">
            <div>
              <label htmlFor="admin-name" className="block text-xs font-bold text-slate-300 mb-1">Display name (optional)</label>
              <input
                id="admin-name"
                type="text"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                placeholder="e.g. Sarah Mitchell"
                maxLength={120}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold text-slate-300 mb-1">Verified Firebase account email</label>
              <input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="person@example.com"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Create the user in Firebase Authentication first and ask them to verify their email. This form grants store-admin access only; superadministrator access remains server-configured.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Promote to Store Admin
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield size={16} className="text-amber-400" /> Active System Administrators ({admins.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-800">
            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading verified accounts…</div>
            ) : admins.length === 0 ? (
              <p className="p-6 text-xs text-slate-400">No active administrator accounts were found.</p>
            ) : admins.map((admin) => (
              <div key={admin.uid} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs truncate">{admin.fullName}</div>
                  <div className="text-[11px] text-slate-400 truncate">{admin.email}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${admin.role === "superadmin" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                    {admin.role}{admin.isBootstrap ? " · bootstrap" : ""}
                  </span>
                  {!admin.isBootstrap && admin.role !== "superadmin" && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(admin)}
                      disabled={revokingUid === admin.uid}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                      aria-label={`Revoke admin access for ${admin.email}`}
                      title="Revoke administrator access"
                    >
                      {revokingUid === admin.uid ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
