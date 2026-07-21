"use client";

import React from "react";
import { useLanguage } from "@/lib/useLanguage";

export function LanguageSwitcher() {
  const { lang, changeLanguage, isMounted } = useLanguage();

  if (!isMounted) return null;

  return (
    <div className="fixed top-20 right-3.5 z-[9999] flex items-center gap-1.5 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold select-none">
      <button
        onClick={() => changeLanguage("sl")}
        className={`px-3 py-1 rounded-full transition-all ${
          lang === "sl"
            ? "bg-[#1B3A6B] text-white"
            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        🇸🇮 SL
      </button>
      <button
        onClick={() => changeLanguage("en")}
        className={`px-3 py-1 rounded-full transition-all ${
          lang === "en"
            ? "bg-[#1B3A6B] text-white"
            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
