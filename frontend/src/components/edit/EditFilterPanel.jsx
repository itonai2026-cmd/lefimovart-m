import React, { useState, useEffect } from "react";

function SliderRow({ label, value, min, max, onChange, neutral }) {
  const neutralPos = neutral != null ? ((neutral - min) / (max - min)) * 100 : null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20 shrink-0">{label}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-center">{min}</span>
      <div className="flex-1 relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-violet-500 h-1.5 rounded-full cursor-pointer"
          style={{
            minHeight: "20px",
            background: `linear-gradient(to right, rgb(107, 114, 128) 0%, rgb(107, 114, 128) ${((value - min) / (max - min)) * 100}%, rgb(148, 163, 184) ${((value - min) / (max - min)) * 100}%, rgb(148, 163, 184) 100%)`
          }}
        />
        {neutralPos != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${neutralPos}%` }}
          >
            <div className="w-0.5 h-3 rounded-full bg-white dark:bg-slate-200 border border-slate-400 dark:border-slate-500" style={{ marginLeft: "-1px" }} />
          </div>
        )}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-center">{max}</span>
    </div>
  );
}

export default function EditFilterPanel({
  activeFilter,
  aiPrompt, setAiPrompt,
  adjust, setAdjust,
  blur, setBlur,
  blurRegion, setBlurRegion,
  blurSelectMode, setBlurSelectMode,
  overlayText, setOverlayText,
  overlayFontSize, setOverlayFontSize,
  overlayFont, setOverlayFont,
  overlayBold, setOverlayBold,
  overlayItalic, setOverlayItalic,
  overlayColor, setOverlayColor,
  overlayAlign, setOverlayAlign,
  rotation, setRotation,
  cropRatio, setCropRatio,
  mirrorH, setMirrorH,
  mirrorV, setMirrorV,
  imageUrl,
  aiEditCost,
  credits,
  onStickerAdd,
}) {
  const [stickers, setStickers] = useState([]);
  const [stickerCat, setStickerCat] = useState("All");
  const [stickersLoading, setStickersLoading] = useState(false);

  useEffect(() => {
    if (activeFilter !== "stickers") return;
    // Stickers not available in lefimovart (no sticker backend)
    setStickersLoading(false);
  }, [activeFilter]);
  if (activeFilter === "ai") {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Edit Prompt</p>
          {credits === null ? (
            <div className="h-7 w-[5.5rem] rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" aria-hidden />
          ) : (
            <div
              className="flex items-center gap-1 shrink-0 rounded-xl border border-violet-100 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1"
              title="Cost per AI edit / current balance"
            >
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 tabular-nums">{aiEditCost}</span>
              <span className="text-xs leading-none" aria-hidden>🪙</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal px-0.5">/</span>
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 tabular-nums">{credits}</span>
              <span className="text-xs leading-none" aria-hidden>🪙</span>
            </div>
          )}
        </div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Text to modify the image"
          rows={4}
          style={{ resize: "none", outline: "none" }}
          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl p-3 text-sm border border-slate-200 dark:border-slate-700 focus:border-violet-500 transition-colors"
        />
      </div>
    );
  }

  if (activeFilter === "adjust") {
    return (
      <div className="px-4 py-4 flex flex-col gap-3">
        <SliderRow
          label="Brightness"
          value={adjust.brightness}
          min={0} max={200}
          neutral={100}
          onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
        />
        <SliderRow
          label="Contrast"
          value={adjust.contrast}
          min={0} max={200}
          neutral={100}
          onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
        />
        <SliderRow
          label="Saturation"
          value={adjust.saturation}
          min={0} max={200}
          neutral={100}
          onChange={(v) => setAdjust((a) => ({ ...a, saturation: v }))}
        />
      </div>
    );
  }

  if (activeFilter === "crop") {
    const ratios = ["Free", "1:1", "4:3", "16:9", "3:4"];
    return (
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Crop Ratio</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {ratios.map((r) => (
            <button
              key={r}
              onClick={() => setCropRatio(r)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px] ${
                cropRatio === r
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white border-slate-200 dark:border-slate-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeFilter === "rotate") {
    const disabled = !imageUrl;
    return (
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rotate</p>
        <div className="flex gap-3 flex-wrap">
          {[90, 180, 270].map((deg) => (
            <button
              key={deg}
              disabled={disabled}
              onClick={() => setRotation((r) => (r + deg) % 360)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors min-h-[40px] ${disabled ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white border-slate-200 dark:border-slate-700"}`}
            >
              +{deg}°
            </button>
          ))}
          <button
            disabled={disabled}
            onClick={() => setRotation(0)}
            className={`px-4 py-2 rounded-xl text-sm border transition-colors min-h-[40px] ${disabled ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"}`}
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-3">Current rotation: {rotation}°</p>
      </div>
    );
  }

  if (activeFilter === "text") {
    const fonts = ["Arial", "Georgia", "Verdana", "Impact", "Courier New", "Times New Roman", "Trebuchet MS"];
    const colors = ["#ffffff", "#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    const sizes = [12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 120];
    const btnBase = "flex items-center justify-center rounded-lg border transition-colors";
    const btnActive = "bg-violet-600 text-white border-violet-600";
    const btnInactive = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    return (
      <div className="px-3 py-3 flex flex-col gap-2.5">
        {/* Textarea */}
        <textarea
          value={overlayText}
          onChange={(e) => setOverlayText(e.target.value)}
          placeholder="Enter overlay text..."
          rows={2}
          style={{ resize: "none", outline: "none" }}
          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 focus:border-violet-500 transition-colors"
        />

        {/* Row 1: Font (1/3) | Size dropdown (1/3) | B + I (1/3) */}
        <div className="flex gap-2">
          <select
            value={overlayFont}
            onChange={(e) => setOverlayFont(e.target.value)}
            className="w-1/3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 outline-none"
            style={{ minHeight: "34px" }}
          >
            {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={overlayFontSize}
            onChange={(e) => setOverlayFontSize(Number(e.target.value))}
            className="w-1/3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 outline-none"
            style={{ minHeight: "34px" }}
          >
            {sizes.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
          <div className="w-1/3 flex gap-1.5">
            <button
              onClick={() => setOverlayBold((b) => !b)}
              className={`flex-1 font-bold text-sm ${btnBase} ${overlayBold ? btnActive : btnInactive}`}
              style={{ minHeight: "34px" }}
            >B</button>
            <button
              onClick={() => setOverlayItalic((i) => !i)}
              className={`flex-1 italic text-sm ${btnBase} ${overlayItalic ? btnActive : btnInactive}`}
              style={{ minHeight: "34px" }}
            >I</button>
          </div>
        </div>

        {/* Row 2: Color dots + custom picker + align buttons (same row) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setOverlayColor(c)}
                className="rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                style={{ width: "14px", height: "14px", minWidth: "14px", minHeight: "14px", backgroundColor: c, borderColor: overlayColor === c ? "#7c3aed" : "transparent" }}
              />
            ))}
            <input
              type="color"
              value={overlayColor}
              onChange={(e) => setOverlayColor(e.target.value)}
              className="rounded-full border-0 cursor-pointer bg-transparent shrink-0"
              style={{ width: "14px", height: "14px", minWidth: "14px", minHeight: "14px", padding: 0 }}
              title="Custom color"
            />
          </div>
          {/* Align icons */}
          <div className="flex gap-1 shrink-0">
            {[
              { id: "left",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
              { id: "center", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> },
              { id: "right",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg> },
            ].map(({ id, icon }) => (
              <button
                key={id}
                onClick={() => setOverlayAlign(id)}
                className={`w-8 h-8 rounded-lg text-sm ${btnBase} ${overlayAlign === id ? btnActive : btnInactive}`}
                style={{ minHeight: "32px", minWidth: "32px" }}
              >{icon}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeFilter === "blur") {
    const noImage = !imageUrl;
    return (
      <div className="px-4 py-4 flex flex-col gap-5">
        <SliderRow
          label="Blur / Crisp"
          value={blur}
          min={-100} max={100}
          neutral={0}
          onChange={setBlur}
        />
        <p className="text-xs text-slate-400 dark:text-slate-600">
          -100 = crisp · 0 = normal · 100 = blur
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={noImage}
            onClick={() => { if (!noImage) setBlurSelectMode((m) => !m); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${noImage ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed" : blurSelectMode ? "bg-violet-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
          >
            {blurSelectMode && !noImage ? "Drawing..." : "Select Area"}
          </button>
          {blurRegion && (
            <button
              onClick={() => { setBlurRegion(null); setBlurSelectMode(false); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
          {blurRegion && (
            <span className="text-xs text-violet-400">Area selected</span>
          )}
        </div>
      </div>
    );
  }

  if (activeFilter === "stickers") {
    const cats = ["All", ...Array.from(new Set(stickers.map((s) => s.category || "Custom")))];
    const visible = stickerCat === "All" ? stickers : stickers.filter((s) => (s.category || "Custom") === stickerCat);
    return (
      <div className="px-3 py-3 flex flex-col gap-2">
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setStickerCat(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${stickerCat === c ? "bg-violet-600 text-white border-violet-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
              style={{ minHeight: "28px" }}
            >
              {c}
            </button>
          ))}
        </div>
        {/* Grid */}
        {stickersLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No stickers in this category.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
            {visible.map((s) => (
              <button
                key={s.id}
                onClick={() => onStickerAdd && onStickerAdd(s)}
                className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                style={{ minHeight: "44px" }}
              >
                <img src={s.url} alt={s.name || "sticker"} className="w-full h-full object-contain p-1" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeFilter === "mirror") {
    const disabled = !imageUrl;
    return (
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mirror</p>
        <div className="flex gap-3 flex-wrap">
          <button
            disabled={disabled}
            onClick={() => setMirrorH((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm border transition-colors min-h-[40px] ${disabled ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed" : mirrorH ? "bg-violet-600 text-white border-violet-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white border-slate-200 dark:border-slate-700"}`}
          >
            Mirror Horizontal
          </button>
          <button
            disabled={disabled}
            onClick={() => setMirrorV((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm border transition-colors min-h-[40px] ${disabled ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed" : mirrorV ? "bg-violet-600 text-white border-violet-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white border-slate-200 dark:border-slate-700"}`}
          >
            Mirror Vertical
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-3">
          {mirrorH && mirrorV ? "Mirrored: Horizontal + Vertical" : mirrorH ? "Mirrored: Horizontal" : mirrorV ? "Mirrored: Vertical" : "No mirror applied"}
        </p>
      </div>
    );
  }

  return null;
}