import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
};

const columns = [
  { key: "user_email", label: "Email" },
  { key: "image_url", label: "Url" },
  { key: "prompt", label: "Prompt" },
  { key: "resolution", label: "Resolution" },
  { key: "status", label: "Status" },
  { key: "request_format", label: "Format" },
  { key: "ip_address", label: "IP" },
  { key: "created_at", label: "Created_at" },
  { key: "model_used", label: "Model" },
];

export default function ImagesTable() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const fetchImages = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`/wp/lefimovart/api/admin/images.php?page=${p}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load images");
      setImages(data.images || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      toast.error(err.message || "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(page);
  }, [page]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return images;
    return images.filter(
      (img) =>
        (img.user_email || "").toLowerCase().includes(q) ||
        (img.prompt || "").toLowerCase().includes(q) ||
        (img.model_used || "").toLowerCase().includes(q) ||
        (img.ip_address || "").toLowerCase().includes(q)
    );
  }, [images, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "created_at") { av = new Date(av); bv = new Date(bv); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email, prompt, model or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-400"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{total} images total &middot; page {page} of {totalPages}</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">#</th>
                {columns.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={key} sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">No images found.</td>
                </tr>
              ) : (
                sorted.map((img, idx) => (
                  <tr key={idx} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
                    <td className="px-3 py-3 text-slate-400 dark:text-slate-500 text-xs font-mono">
                      {(page - 1) * 15 + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {img.user_email || "\u2014"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs max-w-[150px] truncate">
                      {img.image_url ? (
                        <a href={img.image_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">
                          link
                        </a>
                      ) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs max-w-[200px] truncate" title={img.prompt}>
                      {img.prompt || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {img.resolution || "\u2014"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        img.status === "ready"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : img.status === "failed"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                      }`}>
                        {img.status || "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {img.request_format || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {img.ip_address || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                      {img.created_at ? new Date(img.created_at).toLocaleString() : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {img.model_used || "\u2014"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
