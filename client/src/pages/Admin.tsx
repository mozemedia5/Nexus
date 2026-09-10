import React from "react";
import { Route, Switch, useLocation } from "wouter";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminSales from "@/pages/admin/AdminSales";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
import AdminAdmins from "@/pages/admin/AdminAdmins";

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

export interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  role: "superadmin" | "admin";
  isAdmin: boolean;
  createdAt: string;
}

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
    const saved = localStorage.getItem("nexus_admin_campaigns_v1");
    if (saved) {
      const parsed: Campaign[] = JSON.parse(saved);
      return parsed.filter((c) => c.active);
    }
  } catch {}
  return DEFAULT_CAMPAIGNS.filter((c) => c.active);
}

export default function Admin() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/campaigns" component={AdminCampaigns} />
      <Route path="/admin/sales" component={AdminSales} />
      <Route path="/admin/users/:id" component={AdminUserDetail} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/admins" component={AdminAdmins} />
      <Route component={AdminDashboard} />
    </Switch>
  );
}
