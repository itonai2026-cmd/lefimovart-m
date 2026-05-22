import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * TextZoneOverlay - resizable/movable text box rendered over the image.
 * Zone is normalized { x, y, w, h } 0..1 relative to the container.
 * Text wraps within the zone and respects alignment.
 */
const HANDLE_SIZE = 18;
const MIN_ZONE_FRAC = 0.08; // minimum 8% of image dimension

export default function TextZoneOverlay({
  text,
  font,
  fontSize,
  bold,
  italic,
  color,
  align,
  zone,
  onZoneChange,
  scale = 1,
  active,
}) {
  const containerRef = useRef(null);
  const dragging = useRef(null);
  const [localBox, setLocalBox] = useState(null);

  const getLocalSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  // Convert normalized zone to local px box
  useEffect(() => {
    const size = getLocalSize();
    if (!size || !zone) return;
    setLocalBox({
      x: zone.x * size.w,
      y: zone.y * size.h,
      w: zone.w * size.w,
      h: zone.h * size.h,
    });
  }, [zone, getLocalSize]);

  // Re-calc on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const size = getLocalSize();
      if (!size || !zone) return;
      setLocalBox({
        x: zone.x * size.w,
        y: zone.y * size.h,
        w: zone.w * size.w,
        h: zone.h * size.h,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [zone, getLocalSize]);

  const clampBox = useCallback((b) => {
    const size = getLocalSize();
    if (!size) return b;
    const { w: cw, h: ch } = size;
    const minW = MIN_ZONE_FRAC * cw;
    const minH = MIN_ZONE_FRAC * ch;
    let { x, y, w, h } = b;
    w = Math.max(minW, Math.min(w, cw));
    h = Math.max(minH, Math.min(h, ch));
    x = Math.max(0, Math.min(x, cw - w));
    y = Math.max(0, Math.min(y, ch - h));
    return { x, y, w, h };
  }, [getLocalSize]);

  const emitZone = useCallback((b) => {
    const size = getLocalSize();
    if (!size || !b) return;
    onZoneChange({
      x: b.x / size.w,
      y: b.y / size.h,
      w: b.w / size.w,
      h: b.h / size.h,
    });
  }, [onZoneChange, getLocalSize]);

  const getPos = (e) => {
    const touch = e.touches?.[0];
    return { cx: touch ? touch.clientX : e.clientX, cy: touch ? touch.clientY : e.clientY };
  };

  const handlePointerDown = (e, type) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const { cx, cy } = getPos(e);
    dragging.current = { type, startX: cx, startY: cy, origBox: { ...localBox } };

    const onMove = (ev) => {
      ev.preventDefault();
      if (!dragging.current || !containerRef.current) return;
      const { cx: mx, cy: my } = getPos(ev);
      const dx = (mx - dragging.current.startX) / scale;
      const dy = (my - dragging.current.startY) / scale;
      const orig = dragging.current.origBox;
      let nb = { ...orig };

      if (dragging.current.type === "move") {
        nb.x = orig.x + dx;
        nb.y = orig.y + dy;
      } else if (dragging.current.type === "tl") {
        nb.x = orig.x + dx;
        nb.y = orig.y + dy;
        nb.w = orig.w - dx;
        nb.h = orig.h - dy;
      } else if (dragging.current.type === "tr") {
        nb.y = orig.y + dy;
        nb.w = orig.w + dx;
        nb.h = orig.h - dy;
      } else if (dragging.current.type === "bl") {
        nb.x = orig.x + dx;
        nb.w = orig.w - dx;
        nb.h = orig.h + dy;
      } else if (dragging.current.type === "br") {
        nb.w = orig.w + dx;
        nb.h = orig.h + dy;
      }

      nb = clampBox(nb);
      setLocalBox(nb);
      emitZone(nb);
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  if (!localBox) return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;

  const { x, y, w, h } = localBox;
  const hs = HANDLE_SIZE;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 10 }}>
      {/* Text zone box */}
      <div
        className="absolute border-2 border-dashed border-violet-400"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          pointerEvents: active ? "all" : "none",
          boxSizing: "border-box",
          cursor: active ? "move" : "default",
        }}
        onMouseDown={(e) => handlePointerDown(e, "move")}
        onTouchStart={(e) => handlePointerDown(e, "move")}
      >
        {/* Text rendered inside zone */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none select-none"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "4px",
          }}
        >
          {text && (
            <div
              style={{
                fontFamily: `${font || "Arial"}, sans-serif`,
                fontSize: `${fontSize}px`,
                fontWeight: bold ? "bold" : "normal",
                fontStyle: italic ? "italic" : "normal",
                color: color || "white",
                textAlign: align || "center",
                textShadow: "0 0 3px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,0.8)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                lineHeight: 1.2,
                overflow: "hidden",
              }}
            >
              {text}
            </div>
          )}
        </div>

        {/* Corner handles */}
        {active && [
          { type: "tl", style: { top: -hs / 2, left: -hs / 2, cursor: "nwse-resize" } },
          { type: "tr", style: { top: -hs / 2, right: -hs / 2, cursor: "nesw-resize" } },
          { type: "bl", style: { bottom: -hs / 2, left: -hs / 2, cursor: "nesw-resize" } },
          { type: "br", style: { bottom: -hs / 2, right: -hs / 2, cursor: "nwse-resize" } },
        ].map(({ type, style }) => (
          <div
            key={type}
            className="absolute bg-violet-500 rounded-sm shadow-md"
            style={{ width: hs, height: hs, ...style, pointerEvents: "all" }}
            onMouseDown={(e) => handlePointerDown(e, type)}
            onTouchStart={(e) => handlePointerDown(e, type)}
          />
        ))}
      </div>
    </div>
  );
}
