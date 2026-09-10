import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  Search,
  Heart,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

export default function AdminUserDetail() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id || "usr-1";

  const DEFAULT_USER = {
    id: "usr-1",
    fullName: "Sarah Mitchell",
    email: "sarah.m@example.com",
    location: "San Francisco, CA, USA",
    totalOrders: 3,
    totalSpent: 436.00,
    primaryInterest: "Workspace Productivity",
    smartHomeScore: 40,
    workspaceScore: 85,
    searchedKeywords: ["Light Bar", "Ergonomic Setup", "Thunderbolt Dock"],
    likedProducts: ["Nexus Ergonomic Smart Light Bar", "Nexus Smart Climate Sensor & Gateway"],
    lastActive: new Date(Date.now() - 3600000 * 2).toISOString(),
  };

  const [user, setUser] = useState<any>(DEFAULT_USER);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, [userId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading customer profile...</div>;
  }

  if (!user) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-rose-400 font-bold">User profile not found.</div>
        <Link href="/admin/users" className="text-xs text-amber-400 font-bold hover:underline">
          Return to Users list
        </Link>
      </div>
    );
  }

  // EXPORT 1: TXT Export
  const exportTXT = () => {
    const text = `
==================================================
NEXUS STORE — CUSTOMER PROFILE & INTEREST REPORT
==================================================
Full Name: ${user.fullName}
Email: ${user.email}
Location: ${user.location}
Total Orders: ${user.totalOrders}
Total Spent: $${user.totalSpent.toFixed(2)} USD
Primary Interest: ${user.primaryInterest}
Smart Home Score: ${user.smartHomeScore}%
Workspace Score: ${user.workspaceScore}%

Searched Keywords:
${user.searchedKeywords?.map((k: string) => `- ${k}`).join("\n")}

Liked / Wanted Products:
${user.likedProducts?.map((p: string) => `- ${p}`).join("\n")}

Report Generated At: ${new Date().toLocaleString()}
==================================================
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_user_${user.id}_report.txt`;
    a.click();
    toast.success("Exported TXT report!");
  };

  // EXPORT 2: XLS / CSV Export
  const exportXLS = () => {
    const csvContent = `ID,Full Name,Email,Location,Total Orders,Total Spent,Primary Interest,Smart Home Score,Workspace Score
"${user.id}","${user.fullName}","${user.email}","${user.location}",${user.totalOrders},${user.totalSpent},"${user.primaryInterest}",${user.smartHomeScore},${user.workspaceScore}
`;
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_user_${user.id}_data.csv`;
    a.click();
    toast.success("Exported XLS/CSV spreadsheet!");
  };

  // EXPORT 3: DOC Export
  const exportDOC = () => {
    const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><title>Customer Report - ${user.fullName}</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h1 style="color: #d97706;">Nexus Store Customer Profile Report</h1>
  <h2>${user.fullName}</h2>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>Location:</strong> ${user.location}</p>
  <p><strong>Total Orders:</strong> ${user.totalOrders}</p>
  <p><strong>Total Spent:</strong> $${user.totalSpent.toFixed(2)} USD</p>
  <p><strong>Primary Interest:</strong> ${user.primaryInterest}</p>
  <hr />
  <h3>Search Keywords &amp; Product Interests</h3>
  <ul>${user.searchedKeywords?.map((k: string) => `<li>${k}</li>`).join("")}</ul>
  <h3>Liked Products</h3>
  <ul>${user.likedProducts?.map((p: string) => `<li>${p}</li>`).join("")}</ul>
</body>
</html>
`;
    const blob = new Blob([docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_user_${user.id}_doc.doc`;
    a.click();
    toast.success("Exported Word DOC document!");
  };

  // EXPORT 4: PIC (PNG) Image Export
  const exportPIC = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 550;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 800, 550);

    // Header card
    ctx.fillStyle = "#d97706";
    ctx.fillRect(30, 30, 740, 60);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("NEXUS STORE — CUSTOMER PROFILE REPORT", 50, 68);

    // Profile Details Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`Customer: ${user.fullName}`, 50, 140);

    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`Email: ${user.email}`, 50, 175);
    ctx.fillText(`Location: ${user.location}`, 50, 205);
    ctx.fillText(`Total Orders: ${user.totalOrders}   |   Total Spent: $${user.totalSpent.toFixed(2)} USD`, 50, 235);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Primary Interest: ${user.primaryInterest}`, 50, 275);
    ctx.fillText(`Smart Home Score: ${user.smartHomeScore}%   |   Workspace Score: ${user.workspaceScore}%`, 50, 305);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("Searched Keywords:", 50, 350);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(user.searchedKeywords?.join(", ") || "None", 50, 375);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Liked Products:", 50, 415);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(user.likedProducts?.join(", ") || "None", 50, 440);

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `nexus_user_${user.id}_report.png`;
    a.click();
    toast.success("Exported PNG Image (PIC) report!");
  };

  // EXPORT 5: PDF Export (Printable PDF Blob)
  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Nexus Customer Report - ${user.fullName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #d97706; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .badge { background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
            .section { margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { padding: 8px; border: 1px solid #e2e8f0; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Nexus Customer Profile Report</h1>
          <h2>${user.fullName} <span class="badge">${user.primaryInterest}</span></h2>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Location:</strong> ${user.location}</p>
          <p><strong>Total Orders:</strong> ${user.totalOrders}</p>
          <p><strong>Total Spent:</strong> $${user.totalSpent.toFixed(2)} USD</p>

          <div class="section">
            <h3>Customer Interest Metrics</h3>
            <table>
              <tr><th>Smart Home Affinity Score</th><td>${user.smartHomeScore}%</td></tr>
              <tr><th>Workspace Productivity Score</th><td>${user.workspaceScore}%</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Searched Keywords</h3>
            <p>${user.searchedKeywords?.join(", ")}</p>
          </div>

          <div class="section">
            <h3>Liked / Wanted Products</h3>
            <p>${user.likedProducts?.join(", ")}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success("Triggered PDF printable report!");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Users List
        </Link>

        {/* Multi-Format Export Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Download size={14} /> Export Report:
          </span>
          <button
            type="button"
            onClick={exportPDF}
            className="px-2.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={exportXLS}
            className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            XLS / CSV
          </button>
          <button
            type="button"
            onClick={exportDOC}
            className="px-2.5 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            DOC
          </button>
          <button
            type="button"
            onClick={exportPIC}
            className="px-2.5 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            PIC (PNG)
          </button>
          <button
            type="button"
            onClick={exportTXT}
            className="px-2.5 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            TXT
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div ref={reportRef} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{user.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {user.primaryInterest}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Mail size={14} className="text-amber-400" /> {user.email}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-rose-400" /> Location: {user.location}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-black text-amber-400">${user.totalSpent.toFixed(2)} USD</div>
            <span className="text-xs text-slate-400">{user.totalOrders} Completed Orders</span>
          </div>
        </div>

        {/* Affinity Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">Smart Home Affinity</span>
              <span className="font-extrabold text-amber-400">{user.smartHomeScore}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${user.smartHomeScore}%` }} />
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">Workspace Productivity Affinity</span>
              <span className="font-extrabold text-blue-400">{user.workspaceScore}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${user.workspaceScore}%` }} />
            </div>
          </div>
        </div>

        {/* Searched Keywords & Liked Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-amber-400" /> Tracked Search Keywords
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.searchedKeywords?.map((kw: string, idx: number) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={14} className="text-rose-400" /> Wanted / Liked Products
            </h3>
            <div className="space-y-1.5">
              {user.likedProducts?.map((prod: string, idx: number) => (
                <div key={idx} className="p-2 bg-slate-800/60 rounded-lg text-xs font-bold text-amber-300 border border-slate-800">
                  • {prod}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
