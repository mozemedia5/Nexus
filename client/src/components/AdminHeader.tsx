import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  Megaphone,
  TrendingUp,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export interface AdminHeaderProps {
  session: {
    authenticated: boolean;
    role: "superadmin" | "admin";
    email: string;
    name: string;
  };
  onLogout: () => void;
  activePath?: string;
}

export default function AdminHeader({ session, onLogout, activePath }: AdminHeaderProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPath = activePath || location;

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/admin/sales", label: "Sales Report", icon: TrendingUp },
    { href: "/admin/users", label: "User Interests", icon: Users },
    ...(session.role === "superadmin"
      ? [{ href: "/admin/admins", label: "Manage Admins", icon: UserPlus }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1e1f20] border-b border-white/10 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#4285f4]/20 border border-[#4285f4]/40 flex items-center justify-center text-[#4285f4] group-hover:bg-[#4285f4]/30 transition-colors">
                <Shield size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-base tracking-tight text-white flex items-center gap-1.5 font-gemini">
                  Nexus <span className="text-[#4285f4] text-[11px] px-2 py-0.5 rounded-full bg-[#4285f4]/15 font-mono">GEMINI ADMIN</span>
                </span>
                <span className="text-[10px] text-[#9aa0a6] font-normal">A Liverton Store Portal</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                currentPath === link.href ||
                (link.href === "/admin/dashboard" && currentPath === "/admin") ||
                currentPath.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-normal transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#28292a] text-[#4285f4] font-semibold border border-[#4285f4]/30"
                      : "text-[#c4c7c5] hover:text-white hover:bg-[#28292a]"
                  }`}
                >
                  <Icon size={14} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
              title="Open customer storefront in new tab"
            >
              <span>View Store</span>
              <ExternalLink size={12} />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-white">{session.name || "Store Admin"}</div>
                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  {session.role}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign out of Admin Console"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Toggle admin navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-1">
          {navLinks.map((link) => {
            const isActive =
              currentPath === link.href ||
              (link.href === "/admin/dashboard" && currentPath === "/admin") ||
              currentPath.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Logged in as <strong className="text-white">{session.name || session.email}</strong> ({session.role})
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
