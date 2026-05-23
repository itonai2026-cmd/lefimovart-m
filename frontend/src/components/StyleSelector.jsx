import React from "react";
import { ChevronDown } from "lucide-react";

const ARTISTIC_STYLES = [
  { label: "Photorealistic", suffix: "photorealistic, fine details" },
  { label: "Oil Painting", suffix: "oil painting, thick textures" },
  { label: "Watercolor", suffix: "watercolor, transparent colors" },
  { label: "Anime / Manga", suffix: "Japanese animation style" },
];

const LIGHTING_STYLES = [
  { label: "Cinematic", suffix: "cinematic setting, dramatic lights" },
  { label: "Golden Hour", suffix: "warm sunset light" },
  { label: "Neon / Cyberpunk", suffix: "neon lights, futuristic" },
];

const TECHNICAL_STYLES = [
  { label: "3D Render", suffix: "photorealistic 3D rendering" },
  { label: "Minimalist", suffix: "simple, few elements" },
  { label: "Vintage / Retro", suffix: "aged look, sepia" },
];

function StyleDropdown({ title, options, value, onChange }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none text-sm font-medium rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
        <option value="">None</option>
        {options.map((opt) => (
          <option key={opt.label} value={opt.suffix}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-400" />
    </div>
  );
}

export default function StyleSelector({ styles, onStylesChange }) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-3 px-1">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 text-center">
          Select the AI generation style
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <StyleDropdown
            title="Artistic"
            options={ARTISTIC_STYLES}
            value={styles.artistic}
            onChange={(v) => onStylesChange({ ...styles, artistic: v })}
          />
          <StyleDropdown
            title="Lighting"
            options={LIGHTING_STYLES}
            value={styles.lighting}
            onChange={(v) => onStylesChange({ ...styles, lighting: v })}
          />
          <StyleDropdown
            title="Technical"
            options={TECHNICAL_STYLES}
            value={styles.technical}
            onChange={(v) => onStylesChange({ ...styles, technical: v })}
          />
        </div>
      </div>
    </div>
  );
}
