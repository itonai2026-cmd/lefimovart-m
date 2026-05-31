import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
};

const columns = [
  { key: "user_email", label: "Email" },
  { key: "image_path", label: "URL" },
  { key: "prompt", label: "Prompt" },
  { key: "model_used", label: "Model" },
  { key: "resolution", label: "Resolution" },
  { key: "duration", label: "Duration" },
  { key: "format", label: "Format" },
  { key: "credits_deducted", label: "Credits" },
  { key: "completed_at", label: "Completed_at" },
  { key: "ip_address", label: "IP" },
];

export default function VideosTable() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("completed_at");
  const [sortDir, setSortDir] = useState("desc");

  const fetchVideos = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`/wp/lefimovart/api/admin/videos.php?page=${p}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load videos");
      setVideos(data.videos || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      toast.error(err.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(page);
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
    if (!q) return videos;
    return videos.filter(
      (v) =>
        (v.user_email || "").toLowerCase().includes(q) ||
        (v.prompt || "").toLowerCase().includes(q) ||
        (v.model_used || "").toLowerCase().includes(q) ||
        (v.ip_address || "").toLowerCase().includes(q)
    );
  }, [videos, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "completed_at") { av = new Date(av); bv = new Date(bv); }
      if (sortField === "credits_deducted" || sortField === "duration") { av = Number(av); bv = Number(bv); }
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
        <p className="text-xs text-slate-400 mt-2">{total} videos total &middot; page {page} of {totalPages}</p>
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
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">No videos found.</td>
                </tr>
              ) : (
                sorted.map((v, idx) => (
                  <tr key={idx} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
                    <td className="px-3 py-3 text-slate-400 dark:text-slate-500 text-xs font-mono">
                      {(page - 1) * 25 + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.user_email || "\u2014"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs max-w-[150px] truncate">
                      {v.image_path ? (
                        <a href={v.image_path} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">
                          link
                        </a>
                      ) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs max-w-[200px] truncate" title={v.prompt}>
                      {v.prompt || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.model_used || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.resolution || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.duration ? `${v.duration}s` : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.format || "\u2014"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <span className="font-bold text-violet-600 dark:text-violet-400">
                        {v.credits_deducted ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                      {v.completed_at ? new Date(v.completed_at).toLocaleString() : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {v.ip_address || "\u2014"}
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
