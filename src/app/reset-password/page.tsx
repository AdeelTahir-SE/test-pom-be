"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";

function parseRecoveryTokens(): {
  access_token: string | null;
  refresh_token: string | null;
  code: string | null;
} {
  if (typeof window === "undefined") {
    return { access_token: null, refresh_token: null, code: null };
  }
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return {
    access_token: hash.get("access_token") || query.get("access_token"),
    refresh_token: hash.get("refresh_token") || query.get("refresh_token"),
    code: query.get("code"),
  };
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [tokens, setTokens] = useState<{
    access_token: string | null;
    refresh_token: string | null;
    code: string | null;
  }>({ access_token: null, refresh_token: null, code: null });

  useEffect(() => {
    setTokens(parseRecoveryTokens());
    setReady(true);
  }, []);

  const hasLink = useMemo(
    () => Boolean(tokens.access_token || tokens.code),
    [tokens]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("authResetPasswordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("authResetPasswordMismatch"));
      return;
    }

    setSubmitting(true);

    let access = tokens.access_token;
    let refresh = tokens.refresh_token;

    // PKCE recovery links land with ?code= — exchange via oauth callback shape.
    if (!access && tokens.code) {
      const exchange = await api.post<{
        access_token: string;
        refresh_token: string;
      }>("/api/auth/oauth/callback", { code: tokens.code });
      if (exchange.status !== 200 || !exchange.data) {
        setSubmitting(false);
        setError(exchange.error?.message ?? t("authResetLinkInvalid"));
        return;
      }
      access = exchange.data.access_token;
      refresh = exchange.data.refresh_token;
    }

    if (!access) {
      setSubmitting(false);
      setError(t("authResetLinkInvalid"));
      return;
    }

    const res = await api.post("/api/auth/reset-password", {
      access_token: access,
      refresh_token: refresh ?? undefined,
      password,
    });
    setSubmitting(false);

    if (res.status !== 200) {
      setError(res.error?.message ?? t("authResetError"));
      return;
    }

    router.replace("/login?reset=1");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans text-slate-800">
      <div className="relative z-10 w-full max-w-md rounded-[2.5rem] bg-white/75 backdrop-blur-2xl border border-white shadow-[0_30px_70px_-30px_rgba(15,23,42,0.3),inset_0_2px_0_white] p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-light tracking-tight text-slate-950">{t("authResetTitle")}</h2>
          <p className="text-xs text-slate-500 font-light mt-1.5 text-center leading-relaxed">
            {t("authResetSubtitle")}
          </p>
        </div>

        {!ready ? (
          <p className="text-xs text-slate-400 text-center">…</p>
        ) : !hasLink ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
              {t("authResetLinkInvalid")}
            </div>
            <Link href="/forgot-password" className="block text-center text-xs text-[#1B3A6B] font-semibold hover:underline">
              {t("authForgotPassword")}
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
                {t("authResetNewPassword")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-xs focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
              />
            </div>
            <div>
              <label className="block font-['Inter',sans-serif] text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                {t("authResetConfirmPassword")}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-xs focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-gradient-to-b from-[#1B3A6B] to-[#12274b] text-white text-xs font-semibold disabled:opacity-60"
            >
              {submitting ? "…" : t("authResetSubmit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
