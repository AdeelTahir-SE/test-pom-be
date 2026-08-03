"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { api, getToken } from "@/lib/api-client";
import {
  isValidBusinessModule,
  type BusinessModule,
} from "@/config/business-modules";
import {
  clearPendingGoogleRegister,
  readPendingGoogleRegister,
} from "@/lib/pendingGoogleRegister";

const MODULE_LABELS: Record<BusinessModule, string> = {
  construction: "Gradbeništvo",
  field_service: "Terenske storitve",
  cleaning: "Čistilni servis",
  installation: "Montaža / Instalacije",
  facility_management: "Upravljanje objektov",
  logistics: "Logistika",
  moving: "Drugo",
};

const STARTER_MODULES = Object.keys(MODULE_LABELS) as BusinessModule[];

interface GoogleRegisterResponse {
  user: { id: string; role: string };
  company: { id: string };
}

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [businessModule, setBusinessModule] = useState<BusinessModule | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = readPendingGoogleRegister();
    const params = new URLSearchParams(window.location.search);
    const companyFromQuery = params.get("company");
    const moduleFromQuery = params.get("module");
    // Prefer sessionStorage (a11 #9); query params are a fallback from callback.
    const nextCompany =
      pending?.company_name || companyFromQuery || params.get("name") || "";
    if (nextCompany) setCompany(nextCompany);
    const nextModule = pending?.business_module || moduleFromQuery;
    if (isValidBusinessModule(nextModule)) setBusinessModule(nextModule);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!businessModule) {
      setSubmitting(false);
      setError("Izberite panogo");
      return;
    }

    const token = getToken();
    if (!token) {
      setSubmitting(false);
      setError("Manjka overitveni žeton. Prosimo, prijavite se znova.");
      return;
    }
    try {
      const res = await api.post<GoogleRegisterResponse>("/api/auth/register/google", {
        company_name: company.trim(),
        business_module: businessModule,
      });

      if (res.status !== 201 || !res.data) {
        setError(res.error?.message ?? "Registracija ni uspela. Poskusite znova.");
        return;
      }

      clearPendingGoogleRegister();
      router.push("/dashboard/office");
    } catch {
      setError("Registracija ni uspela. Poskusite znova.");
    } finally {
      setSubmitting(false);
    }
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
