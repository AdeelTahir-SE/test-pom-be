"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import {
  clearPendingGoogleRegister,
  readPendingGoogleRegister,
} from "@/lib/pendingGoogleRegister";
import { logClientError } from "@/lib/clientError";
import Link from "next/link";

interface OAuthLoginResponse {
  needs_registration?: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user: {
    id: string;
    email: string;
    full_name?: string;
    role?: "owner" | "manager" | "worker";
  };
  company_id: string | null;
}

interface GoogleRegisterResponse {
  user: { id: string; role: "owner" | "manager" | "worker" };
  company: { id: string };
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
        if (!cancelled) setError(errorDescription);
        return;
      }
      if (!code) {
        if (!cancelled) setError(t("authGoogleMissingCode"));
        return;
      }

      try {
        const res = await api.post<OAuthLoginResponse>("/api/auth/oauth/callback", {
          code,
        });

        if (cancelled) return;

        if (res.status !== 200 || !res.data) {
          if (!cancelled) setError(res.error?.message ?? t("authGoogleFailed"));
          return;
        }

        if (res.data.access_token && res.data.refresh_token) {
          setSession(
            res.data.access_token,
            res.data.refresh_token,
            res.data.expires_in
          );
        }

        if (res.data.needs_registration || !res.data.user.role) {
          const pending = readPendingGoogleRegister();

          if (pending) {
            const finishRes = await api.post<GoogleRegisterResponse>(
              "/api/auth/register/google",
              {
                company_name: pending.company_name,
                business_module: pending.business_module,
                ...(pending.full_name ? { full_name: pending.full_name } : {}),
              }
            );
            if (cancelled) return;

            if (finishRes.status === 201 && finishRes.data) {
              clearPendingGoogleRegister();
              router.replace("/dashboard/office");
              return;
            }

            logClientError("auth.googleRegister", finishRes.error, {
              status: finishRes.status,
            });

            if (!cancelled) {
              setError(finishRes.error?.message ?? t("authGoogleFailed"));
            }
            return;
          }

          if (!cancelled) {
            router.replace("/register/complete-profile");
          }
          return;
        }

        clearPendingGoogleRegister();

        if (!cancelled) {
          if (res.data.user.role === "worker") {
            router.replace("/dashboard/worker");
          } else {
            router.replace("/dashboard/office");
          }
        }
      } catch (err) {
        if (cancelled) return;
        processingRef.current = false;
        logClientError("auth.oauthCallback", err);
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
