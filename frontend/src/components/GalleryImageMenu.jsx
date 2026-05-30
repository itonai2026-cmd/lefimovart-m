import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

const REPORT_OPTIONS = [
  "Offensive content",
  "Sexual content / NSFW",
  "Violence",
  "Child abuse",
  "Hate speech",
  "Other",
];

export default function GalleryImageMenu({ imageId, imageUrl, onFlagged, alignLeft = true }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [sending, setSending] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("touchstart", handleOutside);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const toggleMenu = (event) => {
    event.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        left: alignLeft ? rect.left : rect.right - 224,
      });
    }
    setOpen((value) => !value);
    setSelected("");
  };

  const sendReport = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const response = await fetch("/wp/lefimovart/api/requests/report.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ id: imageId, image_url: imageUrl, flagged_reason: selected }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Could not send report.");
      toast.success("Report sent. Thank you!");
      setOpen(false);
      setSelected("");
      onFlagged?.(imageId);
    } catch (error) {
      toast.error(error.message || "Could not send report. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        title="Report"
        aria-label="Report"
        className="flex items-center justify-center rounded-full bg-black/55 hover:bg-black/70 text-white text-xs font-bold select-none transition-colors"
        style={{ letterSpacing: "0.05em", width: "30px", height: "30px", minWidth: "30px", minHeight: "30px" }}
      >
        ···
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              onClick={(event) => event.stopPropagation()}
              style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-56 p-4"
            >
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">Report</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Select what is wrong:</p>

              <div className="flex flex-col gap-2 mb-4">
                {REPORT_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer select-none group">
                    <input
                      type="radio"
                      name={`report-option-${imageId}`}
                      value={option}
                      checked={selected === option}
                      onChange={() => setSelected(option)}
                      className="accent-violet-600 cursor-pointer"
                      style={{ width: "10px", height: "10px", minWidth: "10px", minHeight: "10px" }}
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {option}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={sendReport}
                disabled={!selected || sending}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-2 transition-all hover:from-violet-700 hover:to-indigo-700 active:scale-95"
              >
                {sending ? "Sending..." : "Report"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
