import React, { useEffect, useMemo, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const IMAGE_FORMATS = [
  { id: "1:1", label: "1:1", standard: "1024 x 1024", hires: "2048 x 2048" },
  { id: "3:2", label: "3:2", standard: "1536 x 1024", hires: "3072 x 2048" },
  { id: "2:3", label: "2:3", standard: "1024 x 1536", hires: "2048 x 3072" },
  { id: "16:9", label: "16:9", standard: "1792 x 1008", hires: "3584 x 2016" },
  { id: "9:16", label: "9:16", standard: "1008 x 1792", hires: "2016 x 3584" },
];

export const IMAGE_MODELS = {
  flux_dev: {
    name: 'FLUX.1 [dev]',
    description: 'High-quality drafts with fast generation. Great value.',
    tier: 'low',
    supports_editing: true,
    cost_table: {
      '1:1':  { standard: 1, hires: 2 },
      '3:2':  { standard: 1, hires: 2 },
      '2:3':  { standard: 1, hires: 2 },
      '16:9': { standard: 1, hires: 2 },
      '9:16': { standard: 1, hires: 2 },
    },
  },
  nano_banana: {
    name: 'Nano Banana Pro',
    description: 'Clean images, precise editing, good consistency. Google model.',
    tier: 'medium',
    supports_editing: true,
    cost_table: {
      '1:1':  { standard: 3, hires: 6 },
      '3:2':  { standard: 3, hires: 6 },
      '2:3':  { standard: 3, hires: 6 },
      '16:9': { standard: 3, hires: 6 },
      '9:16': { standard: 3, hires: 6 },
    },
  },
  gpt_image_2: {
    name: 'GPT Image 2',
    description: 'Assets with text, UI visuals, fine detail. Served through Fal.AI.',
    tier: 'high',
    supports_editing: true,
    cost_table: {
      '1:1':  { standard: 4, hires: 16 },
      '3:2':  { standard: 6, hires: 24 },
      '2:3':  { standard: 6, hires: 24 },
      '16:9': { standard: 7, hires: 28 },
      '9:16': { standard: 7, hires: 28 },
    },
  },
};

const TIER_COLORS = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-700',
};

const TIER_LABELS = { low: 'Budget', medium: 'Balanced', high: 'Premium' };

export function getCost(format = "1:1", renderQuality = "standard", modelKey = "flux_dev") {
  const model = IMAGE_MODELS[modelKey];
  if (!model) return 4;
  return model.cost_table[format]?.[renderQuality] ?? model.cost_table['1:1']?.standard ?? 4;
}

export function getMinCost(modelKey) {
  const m = IMAGE_MODELS[modelKey];
  if (!m) return 0;
  let min = Infinity;
  for (const fmt of Object.values(m.cost_table)) {
    for (const c of Object.values(fmt)) {
      if (c < min) min = c;
    }
  }
  return min === Infinity ? 0 : min;
}

export default function ImageSettings({ settings, setSettings, credits, onImageUpload, referenceImage }) {
  const { format = "1:1", renderQuality = "standard", model = "flux_dev" } = settings;
  const cost = getCost(format, renderQuality, model);
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

  const QualityButton = ({ active, onClick, children, ariaLabel }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`min-h-[62px] rounded-xl border px-3 py-2 text-center transition-all ${
        active
          ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}>
      <span className="block text-sm font-bold">{children}</span>
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto mt-3 px-1 space-y-3">
      {/* Model Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          AI Model
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(IMAGE_MODELS).map(([key, m]) => {
            const active = key === model;
            const minCost = getMinCost(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, model: key }))}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  active
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 ring-1 ring-violet-500"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${active ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-200"}`}>
                    {m.name}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${TIER_COLORS[m.tier]}`}>
                    {TIER_LABELS[m.tier]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mb-1.5">{m.description}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">from</span>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-300">{minCost}</span>
                  <span className="text-sm leading-none" aria-hidden>🪙</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings row: IMG upload, Resolution, Cost, Credits */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="flex flex-wrap gap-5 items-center justify-evenly">
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
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Resolution</span>
            <div className="grid grid-cols-2 gap-2">
              <QualityButton
                active={renderQuality === "standard"}
                onClick={() => setSettings((s) => ({ ...s, renderQuality: "standard" }))}
                ariaLabel="Standard resolution"
              >
                Standard
              </QualityButton>
              <QualityButton
                active={renderQuality === "hires"}
                onClick={() => setSettings((s) => ({ ...s, renderQuality: "hires" }))}
                ariaLabel="High resolution"
              >
                HiRes
              </QualityButton>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Use</span>
            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{cost}</span>
              <span className="text-base leading-none" aria-hidden>🪙</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Credits</span>
            {credits === null ? (
              <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ) : (
              <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-3 py-1.5">
                <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{credits}</span>
                <span className="text-base leading-none" aria-hidden>🪙</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Format selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          Image Format
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {IMAGE_FORMATS.map((option) => {
            const active = option.id === format;
            const dimensions = renderQuality === "hires" ? option.hires : option.standard;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, format: option.id }))}
                aria-pressed={active}
                className={`min-h-[62px] rounded-xl border px-2.5 py-2 text-center transition-all ${
                  active
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-[11px] opacity-75">{dimensions}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
          HiRes output is rendered from the highest supported AI canvas.
        </p>
      </div>
    </div>
  );
}
