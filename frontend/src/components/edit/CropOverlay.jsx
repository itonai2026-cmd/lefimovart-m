import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * CropOverlay - renders an interactive crop box over the image.
 * Must be rendered INSIDE the same scaled wrapper as the image so it zooms together.
 * Props:
 *   ratio: "Free" | "1:1" | "4:3" | "16:9" | "3:4"
 *   onCropChange: ({ x, y, w, h }) => void  — normalized 0..1 values relative to image
 *   scale: current zoom scale (used to convert screen-space mouse deltas to local coords)
 */

const RATIO_MAP = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "3:4": 3 / 4,
};

const HANDLE_SIZE = 20;

export default function CropOverlay({ ratio, onCropChange, scale = 1 }) {
  const containerRef = useRef(null);
  const [box, setBox] = useState(null); // { x, y, w, h } in local px relative to container
  const dragging = useRef(null);

  // Get container local dimensions (unaffected by CSS transforms)
  const getLocalSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  // Initialize box when ratio changes, container mounts, or container resizes (new image loads)
  useEffect(() => {
    const initBox = () => {
      const size = getLocalSize();
      if (!size || !size.w || !size.h) return false;
      const { w: cw, h: ch } = size;

      let bw, bh;
      const r = RATIO_MAP[ratio];
      if (ratio === "Free") {
        bw = cw;
        bh = ch;
      } else {
        const aspect = cw / ch;
        if (aspect > r) {
          bh = ch;
          bw = bh * r;
        } else {
          bw = cw;
          bh = bw / r;
        }
      }

      const newBox = { x: (cw - bw) / 2, y: (ch - bh) / 2, w: bw, h: bh };
      setBox(newBox);
      onCropChange({ x: newBox.x / cw, y: newBox.y / ch, w: newBox.w / cw, h: newBox.h / ch });
      return true;
    };

    let intervalId;
    if (!initBox()) {
      intervalId = setInterval(() => { if (initBox()) clearInterval(intervalId); }, 100);
    }

    // Re-init when container resizes (e.g. new image loads after crop Apply)
    let ro;
    if (containerRef.current) {
      ro = new ResizeObserver(() => initBox());
      ro.observe(containerRef.current);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ro) ro.disconnect();
    };
  }, [ratio]);

  const clampBox = useCallback((b) => {
    const size = getLocalSize();
    if (!size) return b;
    const { w: cw, h: ch } = size;
    const minSize = 40 / scale; // min size in local coords
    let { x, y, w, h } = b;
    w = Math.max(minSize, Math.min(w, cw));
    h = Math.max(minSize, Math.min(h, ch));
    x = Math.max(0, Math.min(x, cw - w));
    y = Math.max(0, Math.min(y, ch - h));
    return { x, y, w, h };
  }, [getLocalSize, scale]);

  const emitCrop = useCallback((b) => {
    const size = getLocalSize();
    if (!size || !b) return;
    onCropChange({ x: b.x / size.w, y: b.y / size.h, w: b.w / size.w, h: b.h / size.h });
  }, [onCropChange, getLocalSize]);

  const getPos = (e) => {
    const touch = e.touches?.[0];
    return { cx: touch ? touch.clientX : e.clientX, cy: touch ? touch.clientY : e.clientY };
  };

  const handlePointerDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const { cx, cy } = getPos(e);
    dragging.current = { type, startX: cx, startY: cy, origBox: { ...box } };

    const onMove = (ev) => {
      ev.preventDefault();
      if (!dragging.current || !containerRef.current) return;
      const { cx: mx, cy: my } = getPos(ev);
      // Divide by scale to convert screen-space delta to local-coord delta
      const dx = (mx - dragging.current.startX) / scale;
      const dy = (my - dragging.current.startY) / scale;
      const orig = dragging.current.origBox;
      let nb = { ...orig };
      const r = RATIO_MAP[ratio];

      if (dragging.current.type === "move") {
        nb.x = orig.x + dx;
        nb.y = orig.y + dy;
      } else {
        if (dragging.current.type === "tl") {
          nb.x = orig.x + dx; nb.y = orig.y + dy;
          nb.w = orig.w - dx; nb.h = orig.h - dy;
        } else if (dragging.current.type === "tr") {
          nb.y = orig.y + dy;
          nb.w = orig.w + dx; nb.h = orig.h - dy;
        } else if (dragging.current.type === "bl") {
          nb.x = orig.x + dx;
          nb.w = orig.w - dx; nb.h = orig.h + dy;
        } else if (dragging.current.type === "br") {
          nb.w = orig.w + dx; nb.h = orig.h + dy;
        }
        if (ratio !== "Free" && r) {
          nb.h = nb.w / r;
        }
      }

      nb = clampBox(nb);
      if (ratio !== "Free" && r) nb.h = nb.w / r;

      setBox(nb);
      emitCrop(nb);
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

  if (!box) return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;

  const { x, y, w, h } = box;
  const hs = HANDLE_SIZE;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none", overflow: "visible" }}>
      {/* Crop box with infinite box-shadow as dark overlay */}
      <div
        className="absolute border-2 border-white cursor-move"
        style={{ left: x, top: y, width: w, height: h, pointerEvents: "all", boxSizing: "border-box", boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
        onMouseDown={(e) => handlePointerDown(e, "move")}
        onTouchStart={(e) => handlePointerDown(e, "move")}
      >
        {/* Rule-of-thirds grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute border-white/30 border-r" style={{ left: "33.3%", top: 0, bottom: 0 }} />
          <div className="absolute border-white/30 border-r" style={{ left: "66.6%", top: 0, bottom: 0 }} />
          <div className="absolute border-white/30 border-b" style={{ top: "33.3%", left: 0, right: 0 }} />
          <div className="absolute border-white/30 border-b" style={{ top: "66.6%", left: 0, right: 0 }} />
        </div>

        {/* Corner handles */}
        {[
          { type: "tl", style: { top: -hs/2, left: -hs/2, cursor: "nwse-resize" } },
          { type: "tr", style: { top: -hs/2, right: -hs/2, cursor: "nesw-resize" } },
          { type: "bl", style: { bottom: -hs/2, left: -hs/2, cursor: "nesw-resize" } },
          { type: "br", style: { bottom: -hs/2, right: -hs/2, cursor: "nwse-resize" } },
        ].map(({ type, style }) => (
          <div
            key={type}
            className="absolute bg-white rounded-sm shadow-md"
            style={{ width: hs, height: hs, ...style, pointerEvents: "all" }}
            onMouseDown={(e) => handlePointerDown(e, type)}
            onTouchStart={(e) => handlePointerDown(e, type)}
          />
        ))}
      </div>
    </div>
  );
}
