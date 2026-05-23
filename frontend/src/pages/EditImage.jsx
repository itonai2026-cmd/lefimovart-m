import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronDown, FolderOpen, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import EditPreview from "../components/edit/EditPreview";
import EditFilterBar from "../components/edit/EditFilterBar";
import EditFilterPanel from "../components/edit/EditFilterPanel";

const API_BASE = "/wp/lefimovart/api";
const AI_EDIT_COST = 4;
const DEFAULT_CREDITS = 40;

const SAVE_EXPORT_FORMATS = {
  png: { mime: "image/png", ext: "png", quality: undefined, opaque: false },
  jpeg: { mime: "image/jpeg", ext: "jpg", quality: 0.92, opaque: true },
  webp: { mime: "image/webp", ext: "webp", quality: 0.92, opaque: false },
};

const SAVE_FORMAT_OPTIONS = [
  { id: "png", label: "PNG" },
  { id: "jpeg", label: "JPG" },
  { id: "webp", label: "WebP" },
];
const SAVE_FORMAT_STORAGE_KEY = "lefi:editSaveFormat";
const readStoredSaveFormat = () => {
  if (typeof window === "undefined") return "png";
  try {
    const v = window.localStorage.getItem(SAVE_FORMAT_STORAGE_KEY);
    return v && SAVE_EXPORT_FORMATS[v] ? v : "png";
  } catch {
    return "png";
  }
};

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/requests/upload.php`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: fd,
  });
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Upload failed on the server (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Upload failed");
  return data.file_url;
}

async function fetchCredits() {
  const res = await fetch(`${API_BASE}/auth/me.php`, { headers: getAuthHeaders() });
  const data = await res.json();
  return data.user?.credits ?? DEFAULT_CREDITS;
}

async function aiEditImage(prompt, imageUrl) {
  const fd = new FormData();
  fd.append("prompt", prompt);
  fd.append("image_url", imageUrl);
  const res = await fetch(`${API_BASE}/requests/edit.php`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: fd,
  });
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`AI edit failed on the server (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "AI edit failed");
  return data;
}

async function saveToGallery(imageUrl, prompt) {
  const fd = new FormData();
  fd.append("image_url", imageUrl);
  fd.append("prompt", prompt);
  const res = await fetch(`${API_BASE}/requests/save.php`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: fd,
  });
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Save failed on the server (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Save failed");
  return data;
}

export default function EditImage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const params = new URLSearchParams(location.search);
  const initialUrl = params.get("url") || null;

  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [realCredits, setRealCredits] = useState(null);
  const [credits, setCredits] = useState(null);
  const [scale, setScale] = useState(1);
  const [activeFilter, setActiveFilter] = useState("ai");
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFormat, setSaveFormat] = useState(readStoredSaveFormat);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const runOptimisticCredits = useCallback(async (nextValue, asyncFn) => {
    setCredits(nextValue);
    try {
      await asyncFn();
    } catch (err) {
      setCredits(realCredits);
      throw err;
    }
  }, [realCredits]);

  useEffect(() => {
    if (!initialUrl) return;
    const sourceUrl = new URL(initialUrl, window.location.origin);
    if (sourceUrl.origin === window.location.origin) return;
    let cancelled = false;
    setUploading(true);
    fetch(sourceUrl.toString())
      .then((r) => r.blob())
      .then(async (blob) => {
        const file = new File([blob], "edit-source.png", { type: blob.type || "image/png" });
        const fileUrl = await uploadFile(file);
        if (!cancelled) setImageUrl(fileUrl);
      })
      .catch(() => { if (!cancelled) toast.error("Could not prepare image for editing."); })
      .finally(() => { if (!cancelled) setUploading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncCredits = async () => {
      try {
        const c = await fetchCredits();
        if (cancelled) return;
        setRealCredits(c);
        setCredits(c);
      } catch {
        if (!cancelled) {
          setRealCredits((c) => c ?? DEFAULT_CREDITS);
          setCredits((c) => c ?? DEFAULT_CREDITS);
        }
      }
    };
    syncCredits();
    const onFocus = () => syncCredits();
    const onVisChange = () => {
      if (document.visibilityState === "visible") syncCredits();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  // Filter state
  const [aiPrompt, setAiPrompt] = useState("");
  const [adjust, setAdjust] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [cropMode, setCropMode] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [overlayText, setOverlayText] = useState("");
  const [overlayFontSize, setOverlayFontSize] = useState(32);
  const [overlayFont, setOverlayFont] = useState("Arial");
  const [overlayBold, setOverlayBold] = useState(false);
  const [overlayItalic, setOverlayItalic] = useState(false);
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlayAlign, setOverlayAlign] = useState("center");
  const [overlayZone, setOverlayZone] = useState({ x: 0.15, y: 0.6, w: 0.7, h: 0.25 });
  const [blur, setBlur] = useState(0);
  const [blurRegion, setBlurRegion] = useState(null);
  const [blurSelectMode, setBlurSelectMode] = useState(false);
  const [cropRatio, setCropRatio] = useState("Free");
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const [lastEditLabel, setLastEditLabel] = useState("Edited image");
  const [placedStickers, setPlacedStickers] = useState([]);

  const [history, setHistory] = useState([]);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  const pushHistory = useCallback((state) => {
    setHistory((h) => [...h.slice(-19), state]);
  }, []);

  const handleLoad = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImageUrl(localUrl);
    setRotation(0);
    setAdjust({ brightness: 100, contrast: 100, saturation: 100 });
    setBlur(0);
    setMirrorH(false);
    setMirrorV(false);
    setAiPrompt("");
    setOverlayText("");
    setHistory([]);
    setUploading(true);
    try {
      const fileUrl = await uploadFile(file);
      setImageUrl(fileUrl);
      URL.revokeObjectURL(localUrl);
    } catch {
      toast.error("Upload failed. AI edits may not work.");
    } finally {
      setUploading(false);
    }
  };

  const renderToBlob = (formatKey = "png") => new Promise((resolve, reject) => {
    const fmt = SAVE_EXPORT_FORMATS[formatKey] || SAVE_EXPORT_FORMATS.png;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const isSwapped = rotation % 180 !== 0;
      canvas.width = isSwapped ? img.naturalHeight : img.naturalWidth;
      canvas.height = isSwapped ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (fmt.opaque) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const renderedWidth = imgRef.current?.clientWidth || img.naturalWidth;
      const blurScale = img.naturalWidth / renderedWidth;
      const blurPx = blur > 0 ? blur * 0.08 * blurScale : 0;
      const sharpAmount = blur < 0 ? Math.abs(blur) / 100 * 1.5 : 0;
      const adjustOnly = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;
      const canvasFilter = `${adjustOnly}${blurPx > 0 ? ` blur(${blurPx}px)` : ""}`;

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
        const temp = document.createElement("canvas");
        temp.width = canvas.width; temp.height = canvas.height;
        const tc = temp.getContext("2d");
        if (blurPx > 0) {
          tc.filter = `blur(${blurPx}px)`;
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
        const rW = imgRef.current?.clientWidth || img.naturalWidth;
        const fontScale = img.naturalWidth / rW;
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
        const zx = (overlayZone?.x ?? 0.15) * canvas.width;
        const zy = (overlayZone?.y ?? 0.6) * canvas.height;
        const zw = (overlayZone?.w ?? 0.7) * canvas.width;
        const zh = (overlayZone?.h ?? 0.25) * canvas.height;
        const wrapLines = (text, maxW) => {
          const paragraphs = text.split("\n");
          const lines = [];
          for (const para of paragraphs) {
            const words = para.split(" ");
            let line = "";
            for (const word of words) {
              const test = line ? `${line} ${word}` : word;
              if (ctx.measureText(test).width > maxW && line) {
                lines.push(line);
                line = word;
              } else {
                line = test;
              }
            }
            lines.push(line);
          }
          return lines;
        };
        const lines = wrapLines(overlayText, zw);
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
      const drawStickers = async () => {
        for (const s of placedStickers) {
          await new Promise((res) => {
            const si = new Image();
            si.crossOrigin = "anonymous";
            si.onload = () => {
              const sw = s.size * canvas.width;
              const sh = sw;
              const sx = s.x * canvas.width;
              const sy = s.y * canvas.height;
              ctx.drawImage(si, sx, sy, sw, sh);
              res();
            };
            si.onerror = res;
            si.src = s.url;
          });
        }
        canvas.toBlob(
          (blob) => {
            if (blob) { resolve(blob); return; }
            if (formatKey === "webp") {
              canvas.toBlob(
                (b2) => (b2 ? resolve(b2) : reject(new Error("Canvas toBlob failed"))),
                "image/png",
              );
              return;
            }
            reject(new Error("Canvas toBlob failed"));
          },
          fmt.mime,
          fmt.quality,
        );
      };
      drawStickers();
    };
    img.onerror = reject;
    img.src = imageUrl;
  });

  const handleSave = async (formatKey) => {
    if (!imageUrl) { toast.error("No image to save."); return; }
    const chosen = SAVE_EXPORT_FORMATS[formatKey] ? formatKey : saveFormat;
    const fmt = SAVE_EXPORT_FORMATS[chosen] || SAVE_EXPORT_FORMATS.png;
    setSaving(true);
    toast.info("Saving image...");
    try {
      const response = await fetch(imageUrl);
      const sourceBlob = await response.blob();

      let finalBlob = sourceBlob;
      let ext = fmt.ext;
      let fileMime = fmt.mime;

      if (fmt.mime !== sourceBlob.type) {
        const bmp = await createImageBitmap(sourceBlob);
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext("2d");
        if (fmt.opaque) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(bmp, 0, 0);
        finalBlob = await new Promise((r) => canvas.toBlob(r, fmt.mime, fmt.quality));
        if (!finalBlob) { finalBlob = sourceBlob; ext = "png"; fileMime = "image/png"; }
      }

      const filename = `lefi-edited.${ext}`;

      if (!isMobile) {
        const blobUrl = URL.createObjectURL(finalBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }

      const fileToUpload = new File([finalBlob], filename, { type: fileMime });
      const fileUrl = await uploadFile(fileToUpload);
      await saveToGallery(fileUrl, lastEditLabel);
      toast.success(isMobile ? "Saved to Gallery!" : "Downloaded & saved to Gallery!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!imageUrl) return;
    if (activeFilter === "ai") {
      if (!aiPrompt.trim()) { toast.error("Enter a prompt first."); return; }
      const cost = AI_EDIT_COST;
      if (credits === null || credits < cost) {
        toast.error("Not enough credits.");
        navigate("/buy-credits");
        return;
      }
      const newCredits = Math.max(0, credits - cost);
      setPending(true);
      try {
        await runOptimisticCredits(newCredits, async () => {
          pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
          const result = await aiEditImage(aiPrompt, imageUrl);
          if (!result?.url) throw new Error("No image returned");
          setRealCredits(result.credits_remaining ?? newCredits);
          setImageUrl(result.url);
          setImageFile(null);
        });
        setLastEditLabel(`Edited: ${aiPrompt.trim()}`);
        toast.success("AI edit applied!");
      } catch {
        toast.error("AI edit failed.");
      } finally {
        setPending(false);
      }
    } else if (activeFilter === "crop") {
      if (!imageUrl || !cropBox) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const cropX = Math.round(cropBox.x * srcW);
        const cropY = Math.round(cropBox.y * srcH);
        const cropW = Math.round(cropBox.w * srcW);
        const cropH = Math.round(cropBox.h * srcH);
        canvas.width = cropW; canvas.height = cropH;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        const file = new File([blob], "cropped.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        setCropBox(null);
        setScale(1);
        setLastEditLabel(`Edited: Crop ${cropRatio}`);
        toast.success("Crop applied!");
      } catch {
        toast.error("Crop failed.");
      } finally {
        setPending(false);
      }
    } else if (activeFilter === "text") {
      if (!overlayText.trim()) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const blob = await renderToBlob();
        const file = new File([blob], "text-applied.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        setLastEditLabel(`Edited: Add text`);
        setOverlayText("");
        setOverlayZone({ x: 0.15, y: 0.6, w: 0.7, h: 0.25 });
        setRotation(0);
        setAdjust({ brightness: 100, contrast: 100, saturation: 100 });
        setBlur(0);
        setMirrorH(false);
        setMirrorV(false);
        toast.success("Text applied!");
      } catch {
        toast.error("Apply text failed.");
      } finally {
        setPending(false);
      }
    } else if (activeFilter === "rotate") {
      if (rotation === 0) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const blob = await renderToBlob();
        const file = new File([blob], "rotated.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        setLastEditLabel(`Edited: Rotate +${rotation}°`);
        setRotation(0);
        toast.success("Rotation applied!");
        requestAnimationFrame(() => setPending(false));
      } catch {
        toast.error("Apply rotation failed.");
        setPending(false);
      }
    } else if (activeFilter === "stickers") {
      if (placedStickers.length === 0) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const blob = await renderToBlob();
        const file = new File([blob], "stickers-applied.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        setLastEditLabel(`Edited: ${placedStickers.length} sticker(s)`);
        setPlacedStickers([]);
        setRotation(0);
        setAdjust({ brightness: 100, contrast: 100, saturation: 100 });
        setBlur(0);
        setMirrorH(false);
        setMirrorV(false);
        toast.success("Stickers applied!");
      } catch {
        toast.error("Apply stickers failed.");
      } finally {
        setPending(false);
      }
    } else if (activeFilter === "mirror") {
      if (!mirrorH && !mirrorV) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const blob = await renderToBlob();
        const file = new File([blob], "mirrored.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        const parts = [];
        if (mirrorH) parts.push("Horizontal");
        if (mirrorV) parts.push("Vertical");
        setLastEditLabel(`Edited: Mirror ${parts.join(" + ")}`);
        setMirrorH(false);
        setMirrorV(false);
        toast.success("Mirror applied!");
      } catch {
        toast.error("Apply mirror failed.");
      } finally {
        setPending(false);
      }
    } else if (activeFilter === "adjust" || activeFilter === "blur") {
      const hasAdjust = adjust.brightness !== 100 || adjust.contrast !== 100 || adjust.saturation !== 100;
      const hasBlur = blur !== 0;
      if (!hasAdjust && !hasBlur) return;
      setPending(true);
      pushHistory({ imageUrl, rotation, adjust, blur, mirrorH, mirrorV, overlayText, overlayZone });
      try {
        const blob = await renderToBlob();
        const file = new File([blob], "adjusted.png", { type: "image/png" });
        const fileUrl = await uploadFile(file);
        setImageUrl(fileUrl);
        const parts = [];
        if (hasAdjust) {
          const changed = [];
          if (adjust.brightness !== 100) changed.push("Brightness");
          if (adjust.contrast !== 100) changed.push("Contrast");
          if (adjust.saturation !== 100) changed.push("Saturation");
          parts.push(`Adjust (${changed.join(", ")})`);
        }
        if (hasBlur) {
          const pct = blur > 0 ? `Blur ${blur}%` : `Crisp ${blur}%`;
          parts.push(blurRegion ? `${pct} (region)` : pct);
        }
        setLastEditLabel(`Edited: ${parts.join(" + ")}`);
        setAdjust({ brightness: 100, contrast: 100, saturation: 100 });
        setBlur(0);
        setMirrorH(false);
        setMirrorV(false);
        setBlurRegion(null);
        setBlurSelectMode(false);
        toast.success("Filter applied!");
      } catch {
        toast.error("Apply filter failed.");
      } finally {
        setPending(false);
      }
    }
  };

  const handleCancel = () => {
    if (history.length === 0) {
      setAdjust({ brightness: 100, contrast: 100, saturation: 100 });
      setBlur(0);
      setMirrorH(false);
      setMirrorV(false);
      setBlurRegion(null);
      setBlurSelectMode(false);
      setOverlayText("");
      setRotation(0);
      setAiPrompt("");
    } else {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setImageUrl(prev.imageUrl);
      setRotation(prev.rotation);
      setAdjust(prev.adjust);
      setBlur(prev.blur);
      setMirrorH(prev.mirrorH ?? false);
      setMirrorV(prev.mirrorV ?? false);
      setOverlayText(prev.overlayText);
      if (prev.overlayZone) setOverlayZone(prev.overlayZone);
    }
  };

  const canApply = (() => {
    if (!imageUrl || pending || uploading || saving) return false;
    if (activeFilter === "ai") {
      return aiPrompt.trim().length > 0 && credits !== null && credits >= AI_EDIT_COST;
    }
    if (activeFilter === "adjust") return adjust.brightness !== 100 || adjust.contrast !== 100 || adjust.saturation !== 100;
    if (activeFilter === "blur") return blur !== 0;
    if (activeFilter === "text") return overlayText.trim().length > 0;
    if (activeFilter === "rotate") return rotation !== 0;
    if (activeFilter === "mirror") return mirrorH || mirrorV;
    if (activeFilter === "stickers") return placedStickers.length > 0;
    if (activeFilter === "crop") return !!cropBox;
    return false;
  })();

  const handleStickerAdd = (sticker) => {
    setPlacedStickers((prev) => [
      ...prev,
      { id: Date.now(), url: sticker.url, x: 0.35, y: 0.35, size: 0.2 },
    ]);
    toast.success("Sticker added! Drag to move.");
  };

  const handleUndo = () => {
    if (history.length === 0) { toast.info("Nothing to undo."); return; }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setImageUrl(prev.imageUrl);
    setRotation(prev.rotation);
    setAdjust(prev.adjust);
    setBlur(prev.blur);
    setMirrorH(prev.mirrorH ?? false);
    setMirrorV(prev.mirrorV ?? false);
    setOverlayText(prev.overlayText);
    if (prev.overlayZone) setOverlayZone(prev.overlayZone);
  };

  return (
    <div className="flex flex-col bg-slate-950" style={{ height: "100dvh" }}>
      {/* Custom Header */}
      <div className="flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md shrink-0" style={{ minHeight: "3.5rem" }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-violet-400 hover:text-violet-300 min-h-[44px] px-2 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <span className="text-sm font-bold text-violet-400 tracking-widest">
          {uploading ? "Uploading..." : "Edit Image"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLoad}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 min-h-[44px] px-2 transition-colors"
            aria-label="Load image"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Load</span>
          </button>
          <div className="relative">
            <button
              disabled={saving || !imageUrl}
              onClick={() => setShowSaveMenu((v) => !v)}
              className={`flex items-center gap-1 min-h-[44px] px-2 transition-colors ${saving || !imageUrl ? "text-slate-600 cursor-not-allowed" : "text-violet-400 hover:text-violet-300"}`}
              aria-label="Save image"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{saving ? "Saving..." : "Save"}</span>
              <ChevronDown className="w-3.5 h-3.5 -ml-0.5 opacity-70" aria-hidden="true" />
            </button>
            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl min-w-[9rem] py-1">
                {SAVE_FORMAT_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setSaveFormat(id);
                      try { window.localStorage.setItem(SAVE_FORMAT_STORAGE_KEY, id); } catch {}
                      setShowSaveMenu(false);
                      handleSave(id);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-800 ${saveFormat === id ? "text-violet-400" : "text-slate-300"}`}
                  >
                    Save as {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Content area */}
      <div className="max-w-2xl w-full mx-auto flex flex-col flex-1 overflow-hidden">
        {/* PREVIEW ZONE */}
        <div className="flex-1 overflow-hidden">
          <EditPreview
            imageUrl={imageUrl}
            scale={scale}
            setScale={setScale}
            rotation={rotation}
            adjust={adjust}
            blur={blur}
            overlayText={overlayText}
            overlayFontSize={overlayFontSize}
            overlayFont={overlayFont}
            overlayBold={overlayBold}
            overlayItalic={overlayItalic}
            overlayColor={overlayColor}
            overlayAlign={overlayAlign}
            overlayZone={overlayZone}
            onOverlayZoneChange={setOverlayZone}
            canvasRef={canvasRef}
            imgRef={imgRef}
            pending={pending}
            activeFilter={activeFilter}
            cropRatio={cropRatio}
            onCropChange={setCropBox}
            blurRegion={blurRegion}
            onBlurRegionChange={setBlurRegion}
            blurSelectMode={blurSelectMode}
            mirrorH={mirrorH}
            mirrorV={mirrorV}
            placedStickers={placedStickers}
            onStickersChange={setPlacedStickers}
          />
        </div>

        {/* FILTER BAR + PANEL CARD */}
        <div className="mx-3 my-2 rounded-2xl overflow-hidden bg-slate-900 shadow-sm border border-slate-800">
          <EditFilterBar
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onUndo={handleUndo}
            canUndo={history.length > 0 && activeFilter !== "ai"}
          />
          <EditFilterPanel
            activeFilter={activeFilter}
            imageUrl={imageUrl}
            aiEditCost={AI_EDIT_COST}
            credits={credits}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            adjust={adjust}
            setAdjust={setAdjust}
            blur={blur}
            setBlur={setBlur}
            blurRegion={blurRegion}
            setBlurRegion={setBlurRegion}
            blurSelectMode={blurSelectMode}
            setBlurSelectMode={setBlurSelectMode}
            overlayText={overlayText}
            setOverlayText={setOverlayText}
            overlayFontSize={overlayFontSize}
            setOverlayFontSize={setOverlayFontSize}
            overlayFont={overlayFont}
            setOverlayFont={setOverlayFont}
            overlayBold={overlayBold}
            setOverlayBold={setOverlayBold}
            overlayItalic={overlayItalic}
            setOverlayItalic={setOverlayItalic}
            overlayColor={overlayColor}
            setOverlayColor={setOverlayColor}
            overlayAlign={overlayAlign}
            setOverlayAlign={setOverlayAlign}
            rotation={rotation}
            setRotation={setRotation}
            cropRatio={cropRatio}
            setCropRatio={setCropRatio}
            mirrorH={mirrorH}
            setMirrorH={setMirrorH}
            mirrorV={mirrorV}
            setMirrorV={setMirrorV}
            onStickerAdd={handleStickerAdd}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="grid grid-cols-2 gap-3 px-4 py-2 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 shrink-0">
        <button
          onClick={handleApply}
          disabled={!canApply}
          className={`flex flex-col items-center justify-center min-h-[56px] gap-0.5 rounded-2xl font-semibold text-sm transition-all duration-200 select-none ${canApply ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
        >
          {pending ? "Applying..." : uploading ? "Uploading..." : "Apply"}
        </button>
        <button
          onClick={handleCancel}
          className="flex flex-col items-center justify-center min-h-[56px] gap-0.5 rounded-2xl text-slate-400 bg-slate-900/60 border-transparent hover:bg-slate-800 hover:text-violet-400 font-semibold text-sm transition-all duration-200 select-none"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
