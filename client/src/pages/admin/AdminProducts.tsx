import React, { useState, useEffect } from "react";
import {
  Package,
  Edit3,
  UploadCloud,
  Video,
  Image as ImageIcon,
  Save,
  Plus,
  CheckCircle2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { FALLBACK_PRODUCTS, type Product } from "@/lib/store";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(FALLBACK_PRODUCTS[0]);
  const [editDescription, setEditDescription] = useState(FALLBACK_PRODUCTS[0]?.description || "");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setEditDescription(selectedProduct.description || "");
      setEditImageUrl(selectedProduct.image?.url || "");
    }
  }, [selectedProduct]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setEditDescription(prod.description);
    setEditImageUrl(prod.image?.url || "");
    setEditVideoUrl("");
  };

  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, resourceType: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Fetch upload signature from backend
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "nexus/products", resourceType }),
      });

      if (!sigRes.ok) throw new Error("Could not fetch Cloudinary upload signature");

      const sigData = await sigRes.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", String(sigData.timestamp));
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);
      if (sigData.uploadPreset) formData.append("upload_preset", sigData.uploadPreset);

      const cloudUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;
      const uploadRes = await fetch(cloudUrl, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.secure_url) {
        if (resourceType === "video") {
          setEditVideoUrl(uploadData.secure_url);
          toast.success("Video uploaded to Cloudinary successfully!");
        } else {
          setEditImageUrl(uploadData.secure_url);
          toast.success("Product image uploaded to Cloudinary!");
        }
      } else {
        throw new Error(uploadData.error?.message || "Cloudinary upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file to Cloudinary");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProductUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: selectedProduct.handle,
          description: editDescription,
          imageUrl: editImageUrl,
          videoUrl: editVideoUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Updated ${selectedProduct.name} successfully!`);
        setProducts((prev) =>
          prev.map((p) =>
            p.handle === selectedProduct.handle
              ? {
                  ...p,
                  description: editDescription,
                  image: editImageUrl ? { url: editImageUrl, altText: p.name } : p.image,
                }
              : p
          )
        );
      } else {
        toast.error(data.error || "Failed to update product.");
      }
    } catch {
      toast.error("Error saving product updates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <Package size={14} /> Catalog Management &amp; Media Updating
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Product Details &amp; Cloudinary Video Attachment
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Update product descriptions, high-resolution imagery, and attach Cloudinary video demonstrations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Selector Sidebar */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Select Product to Edit</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {products.map((prod) => {
              const isSelected = selectedProduct?.handle === prod.handle;
              return (
                <button
                  key={prod.handle}
                  type="button"
                  onClick={() => handleSelectProduct(prod)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-500/50 text-white"
                      : "bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <img
                    src={prod.image?.url}
                    alt={prod.name}
                    className="w-12 h-12 object-cover rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate">{prod.name}</div>
                    <div className="text-[11px] text-amber-400 font-semibold">{prod.price?.amount} USD</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Details Form & Cloudinary Media Upload */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          {selectedProduct ? (
            <form onSubmit={handleSaveProductUpdate} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-extrabold text-white">{selectedProduct.name}</h3>
                  <span className="text-xs text-slate-400">Handle: {selectedProduct.handle}</span>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                  ${selectedProduct.price?.amount} USD
                </span>
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Product Overview &amp; Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white leading-relaxed"
                />
              </div>

              {/* Cloudinary Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-amber-400" /> Cloudinary Product Image
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="Image URL or upload file..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-white"
                  />
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                    <UploadCloud size={14} /> Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCloudinaryUpload(e, "image")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Cloudinary Video Upload / Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Video size={14} className="text-amber-400" /> Cloudinary Product Demonstration Video
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    placeholder="Cloudinary Video URL (e.g., https://res.cloudinary.com/.../video.mp4)"
                    className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-white"
                  />
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                    <Video size={14} /> Upload Video
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleCloudinaryUpload(e, "video")}
                      className="hidden"
                    />
                  </label>
                </div>
                {editVideoUrl && (
                  <div className="mt-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-3">
                    <Play size={18} className="text-amber-400" />
                    <span className="text-xs text-slate-300 truncate flex-1">{editVideoUrl}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      Attached
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || uploading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving Product Updates..." : uploading ? "Uploading Media..." : "Save Product Media & Details"}
              </button>
            </form>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a product from the left menu to manage its details and Cloudinary media.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
