"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/useLanguage";
import type { BusinessModule } from "@/config/business-modules";

const STARTER_MODULES: BusinessModule[] = ["construction", "cleaning", "installation"];

const MODULE_LABELS: Record<BusinessModule, string> = {
  construction: "Gradbeništvo",
  field_service: "Terenske storitve",
  cleaning: "Čistilni servis",
  installation: "Montaža / Instalacije",
  facility_management: "Upravljanje objektov",
  logistics: "Logistika",
  moving: "Drugo",
};

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Velikost podjetja (ni obvezno)" },
  { value: "1-5", label: "1–5 zaposlenih" },
  { value: "6-14", label: "6–14 zaposlenih" },
  { value: "15+", label: "15+ zaposlenih" },
];

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const [company, setCompany] = useState("");
  const [businessModule, setBusinessModule] = useState<BusinessModule | "">("");
  const [companySize, setCompanySize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!businessModule) {
      setSubmitting(false);
      setError("Izberite panogo");
      return;
    }

    // Placeholder: wired for now, backend integration pending.
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] px-4 py-12 relative overflow-hidden font-sans text-slate-800 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="aura-bg-blob-one absolute top-[5%] left-[-15%] w-[40rem] h-[40rem] rounded-full bg-blue-200/20 blur-[8rem]" />
        <div className="aura-bg-blob-two absolute bottom-[5%] right-[-15%] w-[45rem] h-[45rem] rounded-full bg-sky-200/18 blur-[9rem]" />
      </div>

      <div
        className="aura-bg-dots pointer-events-none absolute inset-0 z-0 opacity-[0.04] bg-repeat"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.15) 1px, transparent 0)",
          backgroundSize: "2rem 2rem"
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] px-8 sm:px-10 py-12 sm:py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 mb-8">
          Dopolnite podatke
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[8px] bg-red-50 px-4 py-2.5 text-xs text-red-600 text-center font-medium">
              {error}
            </div>
          )}

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 21h18M5 21V10l7-3 7 3v11M9 21v-4h6v4" />
              </svg>
            </span>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t("authCompanyName")}
              aria-label={t("authCompanyName")}
              required
              className="w-full h-[52px] pl-12 pr-4 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </span>
            <select
              value={businessModule}
              onChange={(e) => setBusinessModule(e.target.value as BusinessModule)}
              required
              aria-label="Panoga"
              className="w-full h-[52px] pl-12 pr-10 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 focus:outline-none appearance-none"
            >
              <option value="" disabled>
                Izberite panogo
              </option>
              {STARTER_MODULES.map((mod) => (
                <option key={mod} value={mod}>
                  {MODULE_LABELS[mod]}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              aria-label="Število zaposlenih"
              className="w-full h-[52px] pl-12 pr-10 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 focus:outline-none appearance-none"
            >
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-[52px] rounded-[8px] bg-[#4A6FBF] text-white text-sm font-semibold hover:bg-[#3d5ea6] disabled:opacity-60"
          >
            {submitting ? "…" : "Ustvari račun"}
          </button>
        </form>
      </div>
    </div>
  );
}
