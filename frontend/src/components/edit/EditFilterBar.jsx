import React from "react";
import {
  SlidersHorizontal,
  Crop,
  RotateCw,
  Type,
  Droplets,
  FlipHorizontal,
  Undo2,
  Sticker,
} from "lucide-react";

const FILTERS = [
  { id: "ai", label: "AI", icon: null, isText: true },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "blur", label: "Blur", icon: Droplets },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "rotate", label: "Rotate", icon: RotateCw },
  { id: "mirror", label: "Mirror", icon: FlipHorizontal },
];

export default function EditFilterBar({ activeFilter, setActiveFilter, onUndo, canUndo }) {
  return (
    <div className="bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center overflow-x-auto no-scrollbar">
        {FILTERS.map(({ id, label, icon: Icon, isText }) => {
          const active = activeFilter === id;
          return (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              aria-label={`Filter: ${label}`}
              aria-pressed={active}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2.5 min-w-[64px] min-h-[56px] shrink-0 transition-all duration-150 select-none border-b-2 ${
                active
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {isText ? (
                <span className="text-base font-bold leading-none">AI</span>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}

        {/* Undo at the end */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo last action"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2.5 min-w-[64px] min-h-[56px] shrink-0 transition-all duration-150 select-none border-b-2 border-transparent ml-auto ${
            canUndo ? "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" : "text-slate-300 dark:text-slate-700 opacity-50"
          }`}
        >
          <Undo2 className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Undo</span>
        </button>
      </div>
    </div>
  );
}