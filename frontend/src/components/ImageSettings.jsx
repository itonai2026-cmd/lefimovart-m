import React, { useEffect, useMemo, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";

const COSTS = { "512": 2, "1024": 4 };

export function getCost(resolution) {
  return COSTS[resolution] ?? 0;
}

export default function ImageSettings({ settings, setSettings, credits, onImageUpload, referenceImage }) {
  const { resolution } = settings;
  const cost = getCost(resolution);
  const fileInputRef = useRef(null);

  const referenceImageUrl = useMemo(
    () => (referenceImage ? URL.createObjectURL(referenceImage) : null),
    [referenceImage]
  );

  useEffect(() => {
    return () => {
      if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
    };
  }, [referenceImageUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image too large. Maximum 6MB.");
      return;
    }
    onImageUpload?.(file);
  };

  const Chip = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
      }`}>
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto mt-3 px-1">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-wrap gap-5 items-center justify-evenly">
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{referenceImage ? "DEL" : "IMG"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => referenceImage ? onImageUpload?.(null) : fileInputRef.current?.click()}
            aria-label={referenceImage ? "Remove reference image" : "Upload reference image"}
            className={`rounded-lg min-h-[44px] min-w-[44px] transition-all border-2 overflow-hidden ${
              referenceImage
                ? "border-violet-500 dark:border-violet-400"
                : "border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
            }`}>
            {referenceImageUrl ? (
              <img src={referenceImageUrl} alt="Reference" className="w-11 h-11 object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-500 m-2.5" />
            )}
          </button>
        </div>

        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Quality</span>
          <div className="flex gap-2">
            {["512", "1024"].map((r) => (
              <Chip
                key={r}
                active={resolution === r}
                onClick={() => setSettings((s) => ({ ...s, resolution: r }))}>
                {r === "512" ? "Low" : "Medium"}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Use</span>
          <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-3 py-1.5">
            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{cost}</span>
            <span className="text-sm">🪙</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Credits</span>
          {credits === null ? (
            <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{credits}</span>
          )}
        </div>
      </div>
    </div>
  );
}
