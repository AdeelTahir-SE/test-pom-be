"use client";

import { translations, TranslationKey } from "./translations";

/**
 * UI language is Slovenian-only (Mark task 6). The former EN switcher and
 * localStorage `dnevnik_lang` toggle are removed — `t()` always reads `translations.sl`.
 */
export function useLanguage() {
  const t = (key: TranslationKey): string => {
    return translations.sl[key] || String(key);
  };

  return {
    lang: "sl" as const,
    changeLanguage: (_newLang: "sl" | "en") => {
      /* no-op — Slovenian only */
    },
    t,
    isMounted: true,
  };
}
