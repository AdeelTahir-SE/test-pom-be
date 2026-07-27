"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, getRefreshToken, setSession, tryRefreshSession } from "./api-client";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "manager" | "worker";
  phone?: string | null;
  is_active: boolean;
}

export interface CurrentCompany {
  id: string;
  name: string;
  business_module: string;
  subscription_active: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

export interface OfficeContact {
  full_name: string;
  email: string | null;
  phone: string | null;
}

async function ensureAccessToken(): Promise<boolean> {
  if (getToken()) return true;
  if (!getRefreshToken()) return false;
  return tryRefreshSession();
}

// Session bootstrap for a protected page: verifies the stored token against
// GET /api/auth/me, redirects to /login if missing/invalid, and gives the
// real role so pages route by role instead of a UI toggle (Gap #1).
export function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [company, setCompany] = useState<CurrentCompany | null>(null);
  const [officeContact, setOfficeContact] = useState<OfficeContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hasSession = await ensureAccessToken();
      if (cancelled) return;
      if (!hasSession) {
        router.replace("/login");
        return;
      }

      const res = await api.get<{
        user: CurrentUser;
        company: CurrentCompany;
        office_contact: OfficeContact | null;
      }>("/api/auth/me");
      if (cancelled) return;
      if (res.status !== 200 || !res.data) {
        // api-client already attempted silent refresh on 401; only clear if still failed.
        if (res.status === 401) {
          setSession(null, null);
        }
        router.replace("/login");
        return;
      }
      setUser(res.data.user);
      setCompany(res.data.company);
      setOfficeContact(res.data.office_contact ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setSession(null, null);
    router.replace("/login");
  }, [router]);

  return { user, company, officeContact, loading, logout };
}
