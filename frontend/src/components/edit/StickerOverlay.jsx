import React, { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Renders draggable, resizable sticker overlays positioned over the actual image.
 * Uses absolute pixel positioning relative to previewRef.
 */
export default function StickerOverlay({ stickers, onChange, containerRef: imgRef, previewRef }) {
  const [, forceUpdate] = useState(0);
  const rafRef = useRef(null);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      forceUpdate((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    const img = imgRef?.current;
    if (img) img.addEventListener("load", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    const t = setTimeout(scheduleUpdate, 80);
    return () => {
      img?.removeEventListener("load", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate, imgRef]);

  const getImageRect = useCallback(() => {
    const img = imgRef?.current;
    const preview = previewRef?.current;
    if (!img || !preview) return null;
    const ir = img.getBoundingClientRect();
    const pr = preview.getBoundingClientRect();
    return { left: ir.left - pr.left, top: ir.top - pr.top, width: ir.width, height: ir.height };
  }, [imgRef, previewRef]);

  const startDrag = useCallback((e, sticker) => {
    // Support both mouse and touch
    e.stopPropagation();
    e.preventDefault();

    const ir = imgRef?.current?.getBoundingClientRect();
    if (!ir || ir.width === 0) return;
    const iW = ir.width;
    const iH = ir.height;
    const isTouch = e.type === "touchstart";
    const getXY = (ev) => isTouch ? { x: ev.touches[0]?.clientX ?? ev.changedTouches[0].clientX, y: ev.touches[0]?.clientY ?? ev.changedTouches[0].clientY } : { x: ev.clientX, y: ev.clientY };
    const startXY = getXY(e);
    const origX = sticker.x;
    const origY = sticker.y;

    const onMove = (ev) => {
      ev.preventDefault();
      const { x, y } = getXY(ev);
      const dx = (x - startXY.x) / iW;
      const dy = (y - startXY.y) / iH;
      onChange((prev) => prev.map((s) =>
        s.id === sticker.id
          ? { ...s, x: Math.max(0, Math.min(0.95, origX + dx)), y: Math.max(0, Math.min(0.95, origY + dy)) }
          : s
      ));
      scheduleUpdate();
    };

    const moveEvt = isTouch ? "touchmove" : "mousemove";
    const upEvt = isTouch ? "touchend" : "mouseup";
    const onUp = () => {
      scheduleUpdate();
      window.removeEventListener(moveEvt, onMove);
      window.removeEventListener(upEvt, onUp);
    };
    window.addEventListener(moveEvt, onMove, { passive: false });
    window.addEventListener(upEvt, onUp);
  }, [onChange, imgRef, scheduleUpdate]);

  const startResize = useCallback((e, sticker) => {
    e.stopPropagation();
    e.preventDefault();
    const ir = imgRef?.current?.getBoundingClientRect();
    if (!ir || ir.width === 0) return;
    const isTouch = e.type === "touchstart";
    const getX = (ev) => isTouch ? (ev.touches[0]?.clientX ?? ev.changedTouches[0].clientX) : ev.clientX;
    const startX = getX(e);
    const origSize = sticker.size;
    const moveEvt = isTouch ? "touchmove" : "mousemove";
    const upEvt = isTouch ? "touchend" : "mouseup";
    const onMove = (ev) => {
      ev.preventDefault();
      const dx = (getX(ev) - startX) / ir.width;
      onChange((prev) => prev.map((s) => s.id === sticker.id ? { ...s, size: Math.max(0.05, Math.min(0.9, origSize + dx)) } : s));
      scheduleUpdate();
    };
    const onUp = () => {
      scheduleUpdate();
      window.removeEventListener(moveEvt, onMove);
      window.removeEventListener(upEvt, onUp);
    };
    window.addEventListener(moveEvt, onMove, { passive: false });
    window.addEventListener(upEvt, onUp);
  }, [onChange, imgRef, scheduleUpdate]);

  const handleDelete = useCallback((e, id) => {
    e.stopPropagation();
    e.preventDefault();
    onChange((prev) => prev.filter((s) => s.id !== id));
  }, [onChange]);

  if (!stickers || stickers.length === 0) return null;
  const ir = getImageRect();
  if (!ir || ir.width === 0) return null;

  return (
    <>
      {stickers.map((s) => {
        const left = ir.left + s.x * ir.width;
        const top = ir.top + s.y * ir.height;
        const size = s.size * ir.width;

        return (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              width: `${size}px`,
              height: `${size}px`,
              cursor: "grab",
              // Override global touch-action: manipulation
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              zIndex: 15,
            }}
            onMouseDown={(e) => startDrag(e, s)}
            onTouchStart={(e) => startDrag(e, s)}
          >
            <img
              src={s.url}
              alt="sticker"
              style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", display: "block" }}
              draggable={false}
            />
            {/* Delete */}
            <button
              onMouseDown={(e) => handleDelete(e, s.id)}
              onTouchStart={(e) => handleDelete(e, s.id)}
              style={{
                position: "absolute", top: "-10px", right: "-10px",
                width: "22px", height: "22px", minWidth: "22px", minHeight: "22px",
                borderRadius: "50%", background: "#ef4444", color: "#fff",
                border: "2px solid #fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 16,
              }}
              aria-label="Remove sticker"
            >
              <X size={10} />
            </button>
            {/* Resize handle */}
            <div
              onMouseDown={(e) => startResize(e, s)}
              onTouchStart={(e) => startResize(e, s)}
              style={{
                position: "absolute", bottom: "-6px", right: "-6px",
                width: "16px", height: "16px", minWidth: "16px", minHeight: "16px",
                background: "#7c3aed", borderRadius: "3px",
                cursor: "se-resize", touchAction: "none",
              }}
              aria-label="Resize sticker"
            />
          </div>
        );
      })}
    </>
  );
}