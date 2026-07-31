"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

interface OAuthLoginResponse {
  needs_registration?: boolean;
access_token?: string;
refresh_token?: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    role?: "owner" | "manager" | "worker";
  };
  company_id: string | null;
}

export default function AuthCallbackPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);
  
useEffect(() => {
  let cancelled = false;
  async function finish() {
  if (processingRef.current) return;
  processingRef.current = true;
    
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorDescription = params.get("error_description") || params.get("error");

      if (errorDescription) {
        setError(errorDescription);
        return;
      }
      if (!code) {
        setError(t("authGoogleMissingCode"));
        return;
      }

 try {
        const res = await api.post<OAuthLoginResponse>(
          "/api/auth/oauth/callback",
          { code }
        );

        if (cancelled) return;

        if (res.status !== 200 || !res.data) {
          setError(res.error?.message ?? t("authGoogleFailed"));
          return;
        }

        if (res.data.access_token && res.data.refresh_token) {
  setSession(res.data.access_token, res.data.refresh_token);
}

        if (res.data.needs_registration || !res.data.user.role) {
          const q = new URLSearchParams();
          if (res.data.user.full_name) q.set("name", res.data.user.full_name);
          if (res.data.user.email) q.set("email", res.data.user.email);
          router.replace(`/register/complete-profile?${q.toString()}`);
          return;
        }

        if (res.data.user.role === "worker") {
          router.replace("/dashboard/worker");
        } else {
          router.replace("/dashboard/office");
        }
} catch {
  processingRef.current = false;

  if (!cancelled) {
    setError(t("authGoogleFailed"));
  }
}
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white border border-slate-100 p-8 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Link href="/login" className="text-xs font-semibold text-[#1B3A6B] hover:underline">
              {t("authBackToLogin")}
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">{t("authGoogleRedirecting")}</p>
        )}
      </div>
    </div>
  );
}
