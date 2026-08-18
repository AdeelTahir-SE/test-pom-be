"use client";

import { useEffect, useState } from "react";
import { api, hasSessionHint, ensureFreshAccessToken } from "@/lib/api-client";

export type LandingSession =
  | { status: "anonymous" }
  | { status: "authenticated"; dashboardHref: string };

function dashboardHrefForRole(role: "owner" | "manager" | "worker"): string {
  return role === "worker" ? "/dashboard/worker" : "/dashboard/office";
}

/**
 * Lightweight, non-redirecting session check for public marketing pages.
 * Starts as "anonymous" (matches SSR, avoids a hydration mismatch) and only
 * calls /api/auth/me when a client-side session hint exists, so the common
 * case — an anonymous visitor with no prior session in this browser tab —
 * never pays for the extra round trip. Unlike useCurrentUser, a failed/expired
 * check just falls back to "anonymous" instead of redirecting to /login.
 */
export function useLandingSession(): LandingSession {
  const [session, setSession] = useState<LandingSession>({ status: "anonymous" });

  useEffect(() => {
    if (!hasSessionHint()) return;
    let cancelled = false;
    (async () => {
      await ensureFreshAccessToken();
      if (cancelled) return;
      const res = await api.get<{ user: { role: "owner" | "manager" | "worker" } }>(
        "/api/auth/me"
      );
      if (cancelled) return;
      if (res.status === 200 && res.data) {
        setSession({
          status: "authenticated",
          dashboardHref: dashboardHrefForRole(res.data.user.role),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
