import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Edit3,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("FULFILLED");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.orders) setOrders(d.orders);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.toLowerCase();
    return orders.filter(
      (o) =>
        o.name?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q)
    );
  }, [orders, query]);

  const handleStartEdit = (order: any) => {
    setEditingOrderId(order.id);
    setEditStatus(order.fulfillmentStatus || "FULFILLED");
    setEditNotes(order.adminNotes || "");
  };

  const handleSaveUpdate = async (orderId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          fulfillmentStatus: editStatus,
          adminNotes: editNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Order progress and notes updated successfully!");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, fulfillmentStatus: editStatus, adminNotes: editNotes }
              : o
          )
        );
        setEditingOrderId(null);
      } else {
        toast.error(data.error || "Failed to update order");
      }
    } catch {
      toast.error("Error updating order details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
            <ShoppingBag size={14} /> Order Management Portal
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Store Orders &amp; Fulfillment Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View orders, write progress notes, and update fulfillment statuses in real time.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order #, customer, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            Showing {filteredOrders.length} Orders
          </span>
          <button
            type="button"
            onClick={fetchOrders}
            className="text-xs text-amber-400 font-semibold hover:underline"
          >
            Refresh Orders
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Customer Details</th>
                <th className="px-4 py-3 font-semibold">Processed Date</th>
                <th className="px-4 py-3 font-semibold">Line Items</th>
                <th className="px-4 py-3 font-semibold">Fulfillment Progress</th>
                <th className="px-4 py-3 font-semibold">Total Price</th>
                <th className="px-4 py-3 font-semibold">Actions / Write</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    {loading ? "Loading live store orders..." : "No orders matching search query."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isEditing = editingOrderId === order.id;
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-amber-400">{order.name}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(order.processedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-xs">
                          {order.lineItems?.map((li: any, idx: number) => (
                            <div key={idx} className="text-[11px] text-slate-300 truncate">
                              • {li.title} (x{li.quantity})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="px-2 py-1 bg-slate-800 border border-amber-500 rounded text-xs text-white focus:outline-none"
                          >
                            <option value="UNFULFILLED">UNFULFILLED</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="IN_TRANSIT">IN_TRANSIT</option>
                            <option value="FULFILLED">FULFILLED</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.fulfillmentStatus === "FULFILLED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : order.fulfillmentStatus === "IN_TRANSIT"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {order.fulfillmentStatus}
                          </span>
                        )}
                        {order.adminNotes && !isEditing && (
                          <div className="text-[10px] text-slate-400 italic mt-1">
                            Note: {order.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-white">
                        ${order.totalPrice?.amount} {order.totalPrice?.currencyCode}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Write admin note..."
                              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-white w-28"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveUpdate(order.id)}
                              disabled={saving}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1"
                            >
                              <Save size={12} /> Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(order)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Edit3 size={12} /> Edit Status
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
