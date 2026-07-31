"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { api, setSession } from "@/lib/api-client";
import type { BusinessModule } from "@/config/business-modules";
import Link from "next/link";

const STARTER_MODULES: BusinessModule[] = [
  "construction",
  "field_service",
  "cleaning",
  "installation",
  "facility_management",
  "logistics",
  "moving",
];

const MODULE_LABELS: Record<BusinessModule, string> = {
  construction: "Gradbeništvo",
  field_service: "Terenske storitve",
  cleaning: "Čistilni servis",
  installation: "Montaža / Instalacije",
  facility_management: "Upravljanje objektov",
  logistics: "Logistika",
  moving: "Selitve",
};

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Izberite velikost" },
  { value: "1-5", label: "1–5 zaposlenih" },
  { value: "6-14", label: "6–14 zaposlenih" },
  { value: "15+", label: "15+ zaposlenih" },
];

interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: "owner" };
  company: { id: string };
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessModule, setBusinessModule] = useState<BusinessModule | "">("");
  const [companySize, setCompanySize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setSubmitting(true);

  if (!businessModule) {
    setSubmitting(false);
    setError("Izberite panogo");
    return;
  }

  try {
    const res = await api.post<RegisterResponse>("/api/auth/register", {
      email,
      password,
      company_name: company,
      business_module: businessModule as BusinessModule,
      company_size: companySize,
      ...(name.trim() ? { full_name: name.trim() } : {}),
    });

    if (res.status !== 201 || !res.data) {
      setError(res.error?.message ?? "Registration failed. Please check your details.");
      return;
    }

    setSession(res.data.access_token, res.data.refresh_token);
    router.push("/dashboard/office");

  } catch {
    setError("Registracija ni uspela. Poskusite znova.");
  } finally {
    setSubmitting(false);
  }
};

  const handleGoogle = async () => {
  setError(null);
  setGoogleLoading(true);

  try {
    const res = await api.get<{ url: string }>("/api/auth/google");

    if (
  res.status !== 200 ||
  !res.data?.url ||
  typeof res.data.url !== "string"
) {
  setError(res.error?.message ?? t("authGoogleFailed"));
  return;
}

    window.location.href = res.data.url;
  } catch {
    setError("Google prijava ni uspela. Poskusite znova.");
  } finally {
    setGoogleLoading(false);
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
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.15) 1px, transparent 0)",
          backgroundSize: "2rem 2rem",
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] px-8 sm:px-10 py-12 sm:py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 mb-8">
          {t("authRegisterTitle")}
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
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

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("authEmailLabel")}
              aria-label={t("authEmailLabel")}
              required
              className="w-full h-[52px] pl-12 pr-4 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("authPassPlaceholder")}
              aria-label={t("authPasswordLabel")}
              required
              minLength={8}
              className="w-full h-[52px] pl-12 pr-4 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || googleLoading}
            className="w-full h-[52px] rounded-[8px] bg-[#4A6FBF] text-white text-sm font-semibold hover:bg-[#3d5ea6] disabled:opacity-60"
          >
            {submitting ? "…" : t("authRegisterBtn")}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-4 w-full h-[52px] rounded-[8px] border-2 border-[#4A6FBF] bg-white text-[#4A6FBF] text-sm font-semibold hover:bg-[#f0f4ff] flex items-center justify-center"
        >
          {t("authLoginBtn")}
        </Link>

        <div className="flex items-center gap-3 py-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] uppercase text-slate-400 font-semibold">
            {t("authOr")}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || submitting}
          className="w-full h-[52px] rounded-[8px] border border-slate-300 bg-white text-[#DB4437] text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 41.4 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
          </svg>
          {googleLoading ? "…" : t("authGoogleRegisterBtn")}
        </button>
      </div>
    </div>
  );
}
