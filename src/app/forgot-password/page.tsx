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
    setError(null);
    setSubmitting(true);
    const res = await api.post<{ message?: string }>("/api/auth/forgot-password", { email });
    setSubmitting(false);
    if (res.status >= 400) {
      setError(res.error?.message ?? t("authForgotError"));
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans text-slate-800">
      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <span className="w-10 h-10 rounded-full bg-gradient-to-b from-white to-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="font-['Inter',sans-serif] text-xs font-semibold text-[#1B3A6B]">PN</span>
            </span>
            <span className="font-['Inter',sans-serif] text-base font-semibold tracking-[-0.08em] text-slate-950">
              pomocnik.net
            </span>
          </Link>
          <h2 className="text-2xl font-light tracking-tight text-slate-950">{t("authForgotTitle")}</h2>
          <p className="text-xs text-slate-500 font-light mt-1.5 text-center leading-relaxed">
            {t("authForgotSubtitle")}
          </p>
        </div>

        {done ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium leading-relaxed">
              {t("authForgotSent")}
            </div>
            <Link
              href="/login"
              className="block w-full h-11 rounded-xl bg-gradient-to-b from-[#1B3A6B] to-[#12274b] text-white text-xs font-semibold text-center leading-[2.75rem]"
            >
              {t("authBackToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block font-['Inter',sans-serif] text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                {t("authEmailLabel")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@podjetje.si"
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-gradient-to-b from-[#1B3A6B] to-[#12274b] border border-[#0d1e3a] text-white text-xs font-semibold disabled:opacity-60"
            >
              {submitting ? "…" : t("authForgotSubmit")}
            </button>
            <p className="text-center text-xs text-slate-500">
              <Link href="/login" className="text-[#1B3A6B] font-semibold hover:underline">
                {t("authBackToLogin")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
