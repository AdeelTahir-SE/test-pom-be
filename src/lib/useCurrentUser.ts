"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  hasSessionHint,
  setSession,
  ensureFreshAccessToken,
} from "./api-client";

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

async function ensureSession(): Promise<boolean> {
  await ensureFreshAccessToken();
  return hasSessionHint();
}

// Session bootstrap for a protected page: verifies cookies against
// GET /api/auth/me, redirects to /login if missing/invalid.
export function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [company, setCompany] = useState<CurrentCompany | null>(null);
  const [officeContact, setOfficeContact] = useState<OfficeContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Try /me even without a client hint — cookies may still be valid after
      // a hard refresh (sessionStorage cleared).
      await ensureFreshAccessToken();
      if (cancelled) return;

      const res = await api.get<{
        user: CurrentUser;
        company: CurrentCompany;
        office_contact: OfficeContact | null;
      }>("/api/auth/me");
      if (cancelled) return;
      if (res.status !== 200 || !res.data) {
        if (res.status === 401 || res.status === 403) {
          setSession(null, null);
          router.replace("/login");
          return;
        }
        // Transient — don't wipe session.
        setLoading(false);
        return;
      }
      setSession(null, null, 3600);
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
    try {
      await api.post("/api/auth/logout");
    } finally {
      setSession(null, null);
      router.replace("/login");
    }
  }, [router]);

  return { user, company, officeContact, loading, logout };
}
