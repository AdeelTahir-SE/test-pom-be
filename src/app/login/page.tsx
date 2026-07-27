"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { api, setSession } from "@/lib/api-client";
import Link from "next/link";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; full_name?: string; role?: "owner" | "manager" | "worker" };
  company_id: string | null;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setInfo(t("authLoginSuccessReset"));
    }
  }, [t]);

  const routeAfterLogin = (data: LoginResponse) => {
    setSession(data.access_token, data.refresh_token);
    if (!data.user.role) {
      router.push("/admin");
    } else if (data.user.role === "worker") {
      router.push("/dashboard/worker");
    } else {
      router.push("/dashboard/office");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const res = await api.post<LoginResponse>("/api/auth/login", { email, password });
    setSubmitting(false);

    if (res.status !== 200 || !res.data) {
      setError(res.error?.message ?? t("authLoginFailed"));
      return;
    }

    routeAfterLogin(res.data);
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const res = await api.get<{ url: string }>("/api/auth/google");
    setGoogleLoading(false);
    if (res.status !== 200 || !res.data?.url) {
      setError(res.error?.message ?? t("authGoogleFailed"));
      return;
    }
    window.location.href = res.data.url;
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
          backgroundSize: "2rem 2rem",
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <span className="w-10 h-10 rounded-full bg-gradient-to-b from-white to-slate-100 border border-slate-200 shadow-[0_2px_6px_rgba(15,23,42,0.05)] flex items-center justify-center">
              <span className="font-['Inter',sans-serif] text-xs font-semibold text-[#1B3A6B]">PN</span>
            </span>
            <span className="font-['Inter',sans-serif] text-base font-semibold tracking-[-0.08em] text-slate-950">
              pomocnik.net
            </span>
          </Link>
          <h2 className="text-2xl font-light tracking-tight text-slate-950">{t("authLoginTitle")}</h2>
          <p className="text-xs text-slate-500 font-light mt-1.5 text-center leading-relaxed">
            {t("authLoginSubtitle")}
          </p>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 font-medium">
              {info}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleLoading || submitting}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 41.4 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            {googleLoading ? "…" : t("authGoogleBtn")}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              {t("authOrEmail")}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block font-['Inter',sans-serif] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  {t("authPasswordLabel")}
                </label>
                <Link href="/forgot-password" className="text-[10px] font-medium text-[#1B3A6B] hover:underline">
                  {t("authForgotPassword")}
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-xs text-slate-800 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-b from-[#1B3A6B] to-[#12274b] border border-[#0d1e3a] text-white text-xs font-semibold shadow-[0_8px_20px_rgba(27,58,107,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-[#234882] hover:to-[#1a3867] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {submitting ? "…" : t("authLoginBtn")}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-light">
            {t("authNoAccount")}{" "}
            <Link href="/register" className="text-[#1B3A6B] font-semibold hover:underline">
              {t("authCreateAccount")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
