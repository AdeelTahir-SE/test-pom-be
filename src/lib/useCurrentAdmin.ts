"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setSession } from "./api-client";

export interface CurrentAdmin {
  id: string;
  email: string;
}

// Session bootstrap for the platform-admin dashboard: verifies the stored
// token against GET /api/admin/me (rejects company-user tokens by
// construction — see withPlatformAdmin) and redirects to /login otherwise.
export function useCurrentAdmin() {
  const router = useRouter();
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      const res = await api.get<{ admin: CurrentAdmin }>("/api/admin/me");
      if (cancelled) return;
      if (res.status !== 200 || !res.data) {
        setSession(null, null);
        router.replace("/login");
        return;
      }
      setAdmin(res.data.admin);
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

  return { admin, loading, logout };
}
