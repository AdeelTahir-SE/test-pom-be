"use client";

import { useEffect, useState } from "react";
import { translations, Language, TranslationKey } from "./translations";

export function useLanguage() {
  const [lang, setLang] = useState<Language>("sl");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dnevnik_lang") as Language;
    if (saved === "en" || saved === "sl") {
      setLang(saved);
    }

    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail === "en" || customEvent.detail === "sl") {
        setLang(customEvent.detail);
      }
    };

    window.addEventListener("dnevnikLanguageChange", handleLangChange);
    return () => {
      window.removeEventListener("dnevnikLanguageChange", handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    localStorage.setItem("dnevnik_lang", newLang);
    setLang(newLang);
    const event = new CustomEvent("dnevnikLanguageChange", { detail: newLang });
    window.dispatchEvent(event);
  };

  const t = (key: TranslationKey): string => {
    // If not mounted yet (hydration phase), default to Slovenian to match server render
    const currentLang = mounted ? lang : "sl";
    const dict = translations[currentLang] || translations.sl;
    return dict[key] || translations.sl[key] || String(key);
  };

  return { lang, changeLanguage, t, isMounted: mounted };
}
