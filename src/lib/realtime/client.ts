"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { api } from "@/lib/api-client";

let cached: SupabaseClient | null = null;

export async function getRealtimeClient(): Promise<SupabaseClient> {
  if (cached) return cached;
  const res = await api.get<{ access_token: string }>("/api/realtime/token");
  if (res.status >= 400 || !res.data?.access_token) {
    throw new Error(res.error?.message ?? "Failed to get realtime token.");
  }
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
  await cached.realtime.setAuth(res.data.access_token);
  return cached;
}

export async function clearRealtimeClient() {
  if (!cached) return;
  await cached.removeAllChannels();
  cached = null;
}
