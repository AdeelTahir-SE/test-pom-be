import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client for backend use ONLY (route handlers / server code).
// Bypasses RLS — the backend is the sole authority for authorization (spec rule),
// so every query we run through this client MUST explicitly filter by company_id.
// Never import this into client components.
//
// Next.js App Router patches the global fetch() and, for requests that don't
// opt out, caches responses keyed by URL — this applies even inside Route
// Handlers unless every fetch explicitly disables it. supabase-js uses the
// global fetch under the hood, so a query whose URL is identical across calls
// (e.g. an unfiltered admin listing with no per-request params) can silently
// return a stale, indefinitely-cached response instead of hitting the DB —
// violating the spec's "every response reflects live database state" rule
// (Part 9). Forcing cache: 'no-store' on every request closes that hole.
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
