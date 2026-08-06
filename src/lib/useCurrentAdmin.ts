"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, ensureFreshAccessToken } from "./api-client";

export interface CurrentAdmin {
  id: string;
  email: string;
}

// Session bootstrap for the platform-admin dashboard via httpOnly cookies.
export function useCurrentAdmin() {
  const router = useRouter();
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await ensureFreshAccessToken();
      if (cancelled) return;

      const res = await api.get<{ admin: CurrentAdmin }>("/api/admin/me");
      if (cancelled) return;
      if (res.status !== 200 || !res.data) {
        if (res.status === 401 || res.status === 403) {
          setSession(null, null);
          router.replace("/login");
          return;
        }
        setLoading(false);
        return;
      }
      setSession(null, null, 3600);
      setAdmin(res.data.admin);
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

  return { admin, loading, logout };
}
