import React, { useRef, useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import CropOverlay from "./CropOverlay";
import TextZoneOverlay from "./TextZoneOverlay";
import BlurRegionOverlay from "./BlurRegionOverlay";
import StickerOverlay from "./StickerOverlay";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

/** Word-wrap text into lines that fit within maxWidth using the current ctx font. */
function wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split("\n");
  const lines = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export default function EditPreview({
  imageUrl,
  scale,
  setScale,
  rotation,
  adjust,
  blur,
  overlayText,
  overlayFontSize,
  overlayFont,
  overlayBold,
  overlayItalic,
  overlayColor,
  overlayAlign,
  overlayZone,
  onOverlayZoneChange,
  canvasRef,
  imgRef,
  pending,
  activeFilter,
  cropRatio,
  onCropChange,
  blurRegion,
  onBlurRegionChange,
  blurSelectMode,
  mirrorH,
  mirrorV,
  placedStickers,
  onStickersChange,
}) {
  const previewRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // Measure preview container dimensions
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setPreviewSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure rendered image dimensions
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const update = () => setImgSize({ w: el.clientWidth, h: el.clientHeight });
    if (el.complete) update();
    el.addEventListener("load", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("load", update); ro.disconnect(); };
  }, [imageUrl]);

  // Build CSS filter strings
  const blurPx = blur > 0 ? blur * 0.08 : 0; // 0-100 maps to 0-8px
  const sharpAmount = blur < 0 ? Math.abs(blur) / 100 * 1.5 : 0; // 0-1.5 for SVG sharpen kernel
  const adjustOnly = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;
  const blurCrispPart = `${blurPx > 0 ? ` blur(${blurPx}px)` : ""}${sharpAmount > 0 ? " url(#edit-sharpen)" : ""}`;
  // If region selected, main img gets only adjust; blurred overlay gets full filter
  const cssFilter = blurRegion ? adjustOnly : `${adjustOnly}${blurCrispPart}`;
  const blurOverlayFilter = `${adjustOnly}${blurCrispPart}`;

  // Canvas filter string (scale blur to natural resolution)
  const renderedW = imgRef?.current?.clientWidth || 1;
  const canvasBlurPx = blurPx > 0 ? blurPx * ((imgRef?.current?.naturalWidth || renderedW) / renderedW) : 0;
  const canvasFilter = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)${canvasBlurPx > 0 ? ` blur(${canvasBlurPx}px)` : ""}`;

  // Render to canvas whenever image/filters change (for save)
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      const isSwapped = rotation % 180 !== 0;
      canvas.width = isSwapped ? img.naturalHeight : img.naturalWidth;
      canvas.height = isSwapped ? img.naturalWidth : img.naturalHeight;

      // Draw image with adjustOnly first (base layer)
      const useRegion = blurRegion && blurRegion.length > 2 && blur !== 0;
      ctx.filter = useRegion ? adjustOnly : canvasFilter;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(mirrorH ? -1 : 1, mirrorV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
      ctx.filter = "none";

      if (useRegion) {
        // Create blurred/sharpened version from the base (adjust-only) canvas
        const temp = document.createElement("canvas");
        temp.width = canvas.width; temp.height = canvas.height;
        const tc = temp.getContext("2d");
        if (canvasBlurPx > 0) {
          tc.filter = `blur(${canvasBlurPx}px)`;
          tc.drawImage(canvas, 0, 0);
        } else {
          tc.drawImage(canvas, 0, 0);
          const origData = tc.getImageData(0, 0, temp.width, temp.height);
          const blurTemp = document.createElement("canvas");
          blurTemp.width = temp.width; blurTemp.height = temp.height;
          const btc = blurTemp.getContext("2d");
          btc.filter = `blur(${1 + sharpAmount}px)`;
          btc.drawImage(canvas, 0, 0);
          const blurData = btc.getImageData(0, 0, temp.width, temp.height);
          const amt = sharpAmount * 2;
          for (let i = 0; i < origData.data.length; i += 4) {
            origData.data[i]   = Math.min(255, Math.max(0, origData.data[i]   + amt * (origData.data[i]   - blurData.data[i])));
            origData.data[i+1] = Math.min(255, Math.max(0, origData.data[i+1] + amt * (origData.data[i+1] - blurData.data[i+1])));
            origData.data[i+2] = Math.min(255, Math.max(0, origData.data[i+2] + amt * (origData.data[i+2] - blurData.data[i+2])));
          }
          tc.putImageData(origData, 0, 0);
        }
        // Clip to freehand region and draw processed version on top
        ctx.save();
        ctx.beginPath();
        blurRegion.forEach((p, i) => {
          const px = p.x * canvas.width, py = p.y * canvas.height;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(temp, 0, 0);
        ctx.restore();
      } else if (sharpAmount > 0) {
        // Full-image unsharp mask (no region)
        const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const temp = document.createElement("canvas");
        temp.width = canvas.width; temp.height = canvas.height;
        const tc = temp.getContext("2d");
        tc.filter = `blur(${1 + sharpAmount}px)`;
        tc.drawImage(canvas, 0, 0);
        const blurData = tc.getImageData(0, 0, canvas.width, canvas.height);
        const amt = sharpAmount * 2;
        for (let i = 0; i < orig.data.length; i += 4) {
          orig.data[i]   = Math.min(255, Math.max(0, orig.data[i]   + amt * (orig.data[i]   - blurData.data[i])));
          orig.data[i+1] = Math.min(255, Math.max(0, orig.data[i+1] + amt * (orig.data[i+1] - blurData.data[i+1])));
          orig.data[i+2] = Math.min(255, Math.max(0, orig.data[i+2] + amt * (orig.data[i+2] - blurData.data[i+2])));
        }
        ctx.putImageData(orig, 0, 0);
      }
      if (overlayText) {
        ctx.filter = "none";
        const renderedWidth = imgRef?.current?.clientWidth || img.naturalWidth;
        const fontScale = img.naturalWidth / renderedWidth;
        const scaledFontSize = Math.round(overlayFontSize * fontScale);
        const fontStyle = `${overlayItalic ? "italic" : "normal"} ${overlayBold ? "bold" : "normal"} ${scaledFontSize}px ${overlayFont || "Arial"}, sans-serif`;
        ctx.font = fontStyle;
        ctx.fillStyle = overlayColor || "white";
        ctx.textAlign = overlayAlign || "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = Math.max(3, scaledFontSize / 10);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        // Render text with word-wrap inside the zone
        const zx = (overlayZone?.x ?? 0.15) * canvas.width;
        const zy = (overlayZone?.y ?? 0.6) * canvas.height;
        const zw = (overlayZone?.w ?? 0.7) * canvas.width;
        const zh = (overlayZone?.h ?? 0.25) * canvas.height;
        const lines = wrapText(ctx, overlayText, zw);
        const lineH = scaledFontSize * 1.2;
        const totalH = lines.length * lineH;
        const startY = zy + (zh - totalH) / 2 + lineH / 2;
        let alignX = zx;
        if ((overlayAlign || "center") === "center") alignX = zx + zw / 2;
        else if ((overlayAlign || "center") === "right") alignX = zx + zw;
        for (let li = 0; li < lines.length; li++) {
          const ly = startY + li * lineH;
          if (ly - lineH / 2 > zy + zh) break;
          ctx.fillText(lines[li], alignX, ly);
        }
        ctx.shadowBlur = 0;
      }
    };
    img.src = imageUrl;
  }, [imageUrl, canvasFilter, canvasBlurPx, adjustOnly, sharpAmount, blur, blurRegion, rotation, mirrorH, mirrorV, overlayText, overlayFontSize, overlayFont, overlayBold, overlayItalic, overlayColor, overlayAlign, overlayZone, canvasRef]);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - 0.25).toFixed(2)));

  // Auto-scale for Rotate mode so the rotated image fits within the preview
  let rotateAutoScale = 1;
  if (activeFilter === "rotate" && imgSize.w && imgSize.h && previewSize.w && previewSize.h) {
    const isSwapped = rotation % 180 !== 0; // 90° or 270° — dimensions swap
    const visW = isSwapped ? imgSize.h : imgSize.w;
    const visH = isSwapped ? imgSize.w : imgSize.h;
    rotateAutoScale = Math.min(1, previewSize.w / visW, previewSize.h / visH);
  }

  return (
    <div ref={previewRef} className={`relative bg-slate-100 dark:bg-slate-950 overflow-hidden flex justify-center h-full w-full ${imageUrl ? ((activeFilter === "rotate" || activeFilter === "mirror") ? "items-center" : "items-start") : "items-center"}`}>
      {/* Hidden canvas for save */}
      <canvas ref={canvasRef} className="hidden" />
      {/* SVG sharpen filter for crisp preview */}
      {sharpAmount > 0 && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="edit-sharpen">
            <feConvolveMatrix
              order="3"
              kernelMatrix={`0 ${-sharpAmount} 0 ${-sharpAmount} ${1 + 4 * sharpAmount} ${-sharpAmount} 0 ${-sharpAmount} 0`}
              preserveAlpha="true"
            />
          </filter>
        </svg>
      )}

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/50 rounded-xl px-2 py-1">
        <button onClick={zoomOut} aria-label="Zoom out" className="flex items-center justify-center w-8 h-8 text-slate-300 hover:text-white transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} aria-label="Zoom in" className="flex items-center justify-center w-8 h-8 text-slate-300 hover:text-white transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Pending overlay */}
      {pending && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-3">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
          <p className="text-sm text-slate-300">Applying AI edit...</p>
        </div>
      )}

      {/* Image or placeholder */}
      {imageUrl ? (
        <div
          style={{
            transform: activeFilter === "crop"
              ? `scale(${scale})`
              : activeFilter === "rotate"
                ? `scale(${scale * rotateAutoScale}) rotate(${rotation}deg) scaleX(${mirrorH ? -1 : 1}) scaleY(${mirrorV ? -1 : 1})`
                : `scale(${scale}) rotate(${rotation}deg) scaleX(${mirrorH ? -1 : 1}) scaleY(${mirrorV ? -1 : 1})`,
            transition: pending ? "none" : "transform 0.2s ease",
            transformOrigin: (activeFilter === "rotate" || activeFilter === "mirror") ? "center center" : "top center",
            maxWidth: "100%",
            width: "fit-content",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Edit preview"
            style={{
              maxWidth: "100%",
              maxHeight: previewSize.h ? `${previewSize.h}px` : "100vh",
              filter: cssFilter,
              display: "block",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            draggable={false}
          />
          {/* Selective blur: clipped overlay showing blur/crisp only in drawn region */}
          {blurRegion && blur !== 0 && (
            <>
              <svg width="0" height="0" style={{ position: "absolute" }}>
                <defs>
                  <clipPath id="blur-region-clip" clipPathUnits="objectBoundingBox">
                    <polygon points={blurRegion.map((p) => `${p.x},${p.y}`).join(" ")} />
                  </clipPath>
                </defs>
              </svg>
              <img
                src={imageUrl}
                alt=""
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  filter: blurOverlayFilter,
                  clipPath: "url(#blur-region-clip)",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </>
          )}
          {/* Blur region freehand drawing overlay */}
          {activeFilter === "blur" && (
            <BlurRegionOverlay
              region={blurRegion}
              onRegionChange={onBlurRegionChange}
              scale={scale}
              active={blurSelectMode}
            />
          )}
          {/* Resizable text zone overlay — only visible when there's text */}
          {activeFilter === "text" && overlayText && (
            <TextZoneOverlay
              text={overlayText}
              font={overlayFont}
              fontSize={overlayFontSize}
              bold={overlayBold}
              italic={overlayItalic}
              color={overlayColor}
              align={overlayAlign}
              zone={overlayZone}
              onZoneChange={onOverlayZoneChange}
              scale={scale}
              active={activeFilter === "text"}
            />
          )}
          {/* Crop overlay inside the scaled wrapper so it zooms together */}
          {activeFilter === "crop" && (
            <CropOverlay key={imageUrl} ratio={cropRatio} onCropChange={onCropChange} scale={scale} />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center">
            <span className="text-3xl">🖼️</span>
          </div>
          <p className="text-sm">Load an image to start editing</p>
        </div>
      )}

      {/* Sticker overlay — rendered after the image so it paints on top and receives pointer events */}
      {imageUrl && placedStickers && placedStickers.length > 0 && (
        <StickerOverlay stickers={placedStickers} onChange={onStickersChange} containerRef={imgRef} previewRef={previewRef} />
      )}
    </div>
  );
}