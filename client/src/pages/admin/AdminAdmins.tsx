import React, { useState, useEffect } from "react";
import { Shield, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/pages/Admin";

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

const ADMINS_STORAGE_KEY = "nexus_admins_v1";

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(ADMINS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ADMINS;
  });

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"admin" | "superadmin">("admin");

  useEffect(() => {
    try {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
    } catch {}
  }, [admins]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <Shield size={14} /> Superadmin Access Control
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Manage Admin Accounts &amp; Role Permissions
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Assign administrator roles (`superadmin` vs `admin`) and control system permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Admin Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus size={16} className="text-amber-400" /> Add New Administrator
          </h2>

          <form onSubmit={handleAddAdmin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Sarah Mitchell"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@nexus.com"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Role</label>
              <select
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value as "admin" | "superadmin")}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="admin">Store Admin (Orders, Campaigns, Metrics)</option>
                <option value="superadmin">Superadmin (Full Access + Manage Admins)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={14} /> Create Admin Account
            </button>
          </form>
        </div>

        {/* Administrators List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield size={16} className="text-amber-400" /> Active System Administrators ({admins.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-800">
            {admins.map((adm) => (
              <div key={adm.uid} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div>
                  <div className="font-bold text-white text-xs">{adm.fullName}</div>
                  <div className="text-[11px] text-slate-400">{adm.email}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  adm.role === "superadmin"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}>
                  {adm.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
