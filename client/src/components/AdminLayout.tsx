import React, { useState, type ReactNode } from "react";
import AdminHeader from "@/components/AdminHeader";
import AiAssistant from "@/components/AiAssistant";
import { Shield, Key, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export interface AdminSession {
  authenticated: boolean;
  role: "superadmin" | "admin";
  email: string;
  name: string;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession>(() => {
    try {
      const saved = localStorage.getItem("nexus_admin_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.authenticated) return parsed;
      }
    } catch {}
    return { authenticated: false, role: "admin", email: "", name: "" };
  });

  const [passkeyInput, setPasskeyInput] = useState("");

  const handleLogout = () => {
    setSession({ authenticated: false, role: "admin", email: "", name: "" });
    localStorage.removeItem("nexus_admin_session");
    toast.info("Signed out of Admin Console");
  };

  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passkey = passkeyInput.trim();

    if (passkey === "superadmin" || passkey === "superadmin2026") {
      const newSess: AdminSession = {
        authenticated: true,
        role: "superadmin",
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
      const newSess: AdminSession = {
        authenticated: true,
        role: "admin",
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

  if (!session.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-1">Nexus Admin Portal</h1>
          <p className="text-xs text-slate-400 mb-6">
            Separate, secure management portal for Nexus store administrators.
          </p>

          <form onSubmit={handlePasskeySubmit} className="space-y-4">
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="Enter Admin Passkey (e.g. nexus-admin-2026)"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white placeholder-slate-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Access Admin Console</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-left space-y-1">
            <p className="font-semibold text-slate-400">Available Passkeys:</p>
            <p>• Superadmin: <code className="text-amber-400 font-mono">superadmin2026</code></p>
            <p>• Store Admin: <code className="text-amber-400 font-mono">nexus-admin-2026</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131314] text-[#e3e3e3] flex flex-col font-gemini">
      <AdminHeader session={session} onLogout={handleLogout} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <AiAssistant />
    </div>
  );
}
