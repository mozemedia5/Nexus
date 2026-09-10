import React, { useState, useEffect } from "react";
import {
  DollarSign,
  ShoppingBag,
  Percent,
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/metrics").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ])
      .then(([metricsData, ordersData]) => {
        if (metricsData.metrics) setMetrics(metricsData.metrics);
        if (ordersData.orders) setOrders(ordersData.orders);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-500 dark:text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={14} /> Nexus Executive Dashboard
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Store Performance &amp; Real-time Metrics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag size={14} /> Manage Orders
          </Link>
          <Link
            href="/admin/analytics"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={14} /> Full Analytics
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales Revenue</span>
            <DollarSign size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${metrics?.totalRevenue !== undefined ? metrics.totalRevenue.toFixed(2) : "0.00"}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> Live updated from transactions
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics?.totalOrders ?? orders.length ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Directly synced via Shopify Admin API</p>
        </div>

        <div className="bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
            <Percent size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics?.conversionRate ?? 0}%
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> Calculated from store visits
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Order Value (AOV)</span>
            <BarChart3 size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${metrics?.averageOrderValue !== undefined ? metrics.averageOrderValue.toFixed(2) : "0.00"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Multi-item discount enabled</p>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={16} className="text-amber-500 dark:text-amber-400" /> Recent Customer Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No orders placed yet. Real orders will appear here automatically upon store activity.
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{order.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">• {order.customerName}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {order.lineItems?.map((li: any) => li.title).join(", ")}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-amber-600 dark:text-amber-400">${order.totalPrice?.amount} USD</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {order.fulfillmentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Selling Products Preview */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E1F20] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 dark:text-amber-400" /> Top Sellers
            </h2>
            <Link
              href="/admin/analytics"
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Analytics
            </Link>
          </div>

          <div className="space-y-3">
            {(metrics?.topSellingProducts || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No top sellers logged yet. Metrics update dynamically with store purchases.
              </div>
            ) : (
              (metrics?.topSellingProducts || []).slice(0, 4).map((prod: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{prod.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{prod.unitsSold} units sold</div>
                  </div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">${prod.revenue}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
