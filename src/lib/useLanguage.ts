"use client";

import { useCallback } from "react";
import { translations, TranslationKey } from "./translations";

/**
 * UI language is Slovenian-only (Mark task 6). The former EN switcher and
 * localStorage `dnevnik_lang` toggle are removed — `t()` always reads `translations.sl`.
 */
export function useLanguage() {
  // Must be referentially stable — callers put `t` in useCallback/useEffect deps
  // (e.g. worker dashboard loadAll). A new function each render caused /api/jobs
  // to poll in a tight loop.
  const t = useCallback((key: TranslationKey): string => {
    return translations.sl[key] || String(key);
  }, []);

  const changeLanguage = useCallback((_newLang: "sl" | "en") => {
    /* no-op — Slovenian only */
  }, []);

  return {
    lang: "sl" as const,
    changeLanguage,
    t,
    isMounted: true,
  };
}
