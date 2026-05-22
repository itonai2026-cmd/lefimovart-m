import React, { useRef, useState, useCallback } from "react";

/**
 * BlurRegionOverlay - freehand drawing overlay for selective blur.
 * Renders inside the scaled image wrapper so it zooms together.
 * Points are normalized 0..1 relative to the container.
 */
export default function BlurRegionOverlay({ region, onRegionChange, scale = 1, active }) {
  const containerRef = useRef(null);
  const drawing = useRef(false);
  const [currentPoints, setCurrentPoints] = useState([]);

  const getLocalPos = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return null;
    const touch = e.touches?.[0];
    const cx = touch ? touch.clientX : e.clientX;
    const cy = touch ? touch.clientY : e.clientY;
    const rect = el.getBoundingClientRect();
    const s = scale || 1;
    // Convert screen coords to local (unscaled) normalized coords
    const x = (cx - rect.left) / rect.width;
    const y = (cy - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, [scale]);

  const handlePointerDown = (e) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    drawing.current = true;
    const pos = getLocalPos(e);
    if (!pos) return;
    setCurrentPoints([pos]);
    onRegionChange(null); // clear previous region while drawing

    const onMove = (ev) => {
      ev.preventDefault();
      if (!drawing.current) return;
      const p = getLocalPos(ev);
      if (!p) return;
      setCurrentPoints((pts) => [...pts, p]);
    };

    const onUp = () => {
      drawing.current = false;
      setCurrentPoints((pts) => {
        if (pts.length > 2) {
          onRegionChange(pts);
        }
        return [];
      });
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

  // Build SVG polygon points string from normalized coords
  const toSvgPoints = (pts) =>
    pts.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ");

  const displayPoints = currentPoints.length > 0 ? currentPoints : region;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: active ? "all" : "none",
        cursor: active ? "crosshair" : "default",
        zIndex: 15,
      }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      {displayPoints && displayPoints.length > 2 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        >
          <polygon
            points={displayPoints.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
            fill="rgba(139,92,246,0.12)"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={displayPoints.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
            fill="none"
            stroke="rgba(139,92,246,1)"
            strokeWidth="0.4"
            strokeDasharray="1.5,1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}
