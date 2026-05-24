import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Layout({ children, tabs, activeTab, onTabChange, headerCredits }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") return false;
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div
      className="bg-background dark:bg-none dark:bg-slate-950 flex flex-col select-none overflow-hidden"
      style={{ height: "100dvh", overscrollBehavior: "none" }}
      role="application"
      aria-label="LefiMovArt Application"
    >
      <style>{`
        body { overscroll-behavior: none; background-color: transparent; }
        html.dark body { background-color: #020617; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Blur background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-100/40 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between relative shrink-0 px-4"
        style={{
          paddingTop: "var(--sat, env(safe-area-inset-top))",
          minHeight: "calc(3.5rem + var(--sat, env(safe-area-inset-top)))",
        }}
        role="banner"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-indigo-600 dark:text-violet-400 tracking-widest pointer-events-none">
          LefiMovArt
        </h1>

        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-primary whitespace-nowrap">
            {headerCredits ?? user?.credits ?? 0} credits
          </p>
          <button
            onClick={() => setDark((d) => !d)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden relative" 
        style={{ paddingBottom: "calc(4rem + var(--sab, env(safe-area-inset-bottom)))" }}
        role="main"
      >
        <div className="w-full">{children}</div>
      </main>

      {/* Bottom Navigation */}
      {tabs && tabs.length > 0 && (
        <nav
          className="shrink-0 grid gap-3 px-4 z-50"
          style={{
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            paddingBottom: "max(0.5rem, var(--sab, env(safe-area-inset-bottom)))",
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-label={`Navigate to ${label}`}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-h-[56px] gap-0.5 transition-all duration-200 select-none rounded-2xl ${
                  active
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                    : "text-violet-700 bg-violet-50 border border-violet-100 dark:text-slate-500 dark:bg-slate-900/60 dark:border-transparent hover:bg-violet-100 hover:border-violet-200 hover:text-violet-800 dark:hover:bg-slate-800 dark:hover:text-violet-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
