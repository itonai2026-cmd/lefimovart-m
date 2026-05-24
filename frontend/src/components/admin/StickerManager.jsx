import React, { useState, useEffect, useRef } from "react";
import { Upload, Trash2, ImagePlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Custom", "Faces", "Hearts", "Stars", "Nature", "Gestures", "Plants", "Animals", "Emoji", "Other"];

const API_BASE = "/wp/lefimovart/api";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export default function StickerManager() {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("Custom");
  const fileInputRef = useRef(null);

  const fetchStickers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stickers.php`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load stickers");
      setStickers(data.stickers || []);
    } catch {
      toast.error("Failed to load stickers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStickers(); }, []);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name.replace(/\.[^.]+$/, ""));
        formData.append("category", newCategory);
        const res = await fetch(`${API_BASE}/admin/stickers.php`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Upload failed");
        successCount++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} sticker${successCount > 1 ? "s" : ""}`);
      fetchStickers();
    }
    setUploading(false);
  };

  const handleDelete = async (sticker) => {
    try {
      const res = await fetch(`${API_BASE}/admin/stickers.php?id=${sticker.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      setStickers((prev) => prev.filter((s) => s.id !== sticker.id));
      toast.success("Sticker deleted.");
    } catch {
      toast.error("Failed to delete sticker.");
    }
  };

  const handleChangeCategory = async (sticker, newCat) => {
    try {
      const res = await fetch(`${API_BASE}/admin/stickers.php?id=${sticker.id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCat }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Update failed");
      setStickers((prev) => prev.map((s) => s.id === sticker.id ? { ...s, category: newCat } : s));
    } catch {
      toast.error("Failed to update category.");
    }
  };

  const grouped = stickers.reduce((acc, s) => {
    const cat = s.category || "Custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-violet-500" />
          Sticker Gallery
        </h2>
        <button
          onClick={fetchStickers}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-500 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-400"
            style={{ minHeight: "40px" }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            style={{ minHeight: "40px" }}
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload Stickers"}
          </button>
          <span className="text-xs text-slate-400">PNG, JPG, WebP, SVG · multiple files OK</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : stickers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
          <ImagePlus className="w-10 h-10 opacity-30" />
          <p className="text-sm">No stickers yet. Upload some above!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{cat} ({items.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 aspect-square flex items-center justify-center"
                  >
                    <img
                      src={s.url}
                      alt={s.name || "sticker"}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                    <button
                      onClick={() => handleDelete(s)}
                      className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      style={{ minWidth: "24px", minHeight: "24px" }}
                      aria-label="Delete sticker"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={s.category || "Custom"}
                        onChange={(e) => handleChangeCategory(s, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/70 text-white text-[9px] text-center px-0.5 py-0.5 border-0 outline-none cursor-pointer"
                        style={{ minHeight: "unset" }}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
