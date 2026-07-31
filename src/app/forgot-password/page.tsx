"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (submitting) return;

  setError(null);
  setSubmitting(true);

  try {
    const res = await api.post<{ message?: string }>(
      "/api/auth/forgot-password",
      { email: email.trim().toLowerCase() }
    );

    if (res.status >= 400) {
      setError(t("authForgotError"));
      return;
    }

    setDone(true);
  } catch {
    setError(t("authForgotError"));
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
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.15) 1px, transparent 0)",
          backgroundSize: "2rem 2rem",
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] px-8 sm:px-10 py-12 sm:py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 mb-8">
          {t("authForgotTitle")}
        </h2>
        <p className="text-center text-sm text-slate-500 mb-8">
          {t("authForgotSubtitle")}
        </p>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-[8px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 text-center font-medium">
              {t("authForgotSent")}
            </div>
            <Link
              href="/login"
              className="block w-full h-[52px] rounded-[8px] bg-[#4A6FBF] text-white text-sm font-semibold text-center leading-[3.25rem] hover:bg-[#3d5ea6] transition-colors"
            >
              {t("authBackToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[8px] bg-red-50 px-4 py-2.5 text-xs text-red-600 text-center font-medium">
                {error}
              </div>
            )}

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
  type="email"
  autoComplete="email"
  value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("authEmailLabel")}
                required
                className="w-full h-[52px] pl-12 pr-4 rounded-[8px] border border-slate-300 bg-[#F5F5F5] text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[52px] rounded-[8px] bg-[#4A6FBF] text-white text-sm font-semibold hover:bg-[#3d5ea6] disabled:opacity-60 transition-colors"
            >
              {submitting ? "…" : t("authForgotSubmit")}
            </button>

            <Link
              href="/login"
              className="block w-full h-[52px] rounded-[8px] border-2 border-[#4A6FBF] bg-white text-[#4A6FBF] text-sm font-semibold text-center leading-[3.25rem] hover:bg-[#f0f4ff] transition-colors"
            >
              {t("authBackToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
