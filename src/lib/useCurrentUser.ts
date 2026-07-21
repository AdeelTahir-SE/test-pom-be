"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setSession } from "./api-client";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "manager" | "worker";
  is_active: boolean;
}

export interface CurrentCompany {
  id: string;
  name: string;
  business_module: string;
  subscription_active: boolean;
}

// Session bootstrap for a protected page: verifies the stored token against
// GET /api/auth/me, redirects to /login if missing/invalid, and gives the
// real role so pages route by role instead of a UI toggle (Gap #1).
export function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [company, setCompany] = useState<CurrentCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      const res = await api.get<{ user: CurrentUser; company: CurrentCompany }>("/api/auth/me");
      if (cancelled) return;
      if (res.status !== 200 || !res.data) {
        setSession(null, null);
        router.replace("/login");
        return;
      }
      setUser(res.data.user);
      setCompany(res.data.company);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setSession(null, null);
    router.replace("/login");
  }, [router]);

  return { user, company, loading, logout };
}
