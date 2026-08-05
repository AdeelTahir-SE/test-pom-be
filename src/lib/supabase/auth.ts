import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Anon client used only to verify a user's Bearer JWT and to perform
// email/password sign-in. It never has elevated privileges.
//
// cache: 'no-store' avoids Next.js's App Router fetch caching (see the same
// note in lib/supabase/admin.ts) — auth checks must never read a stale response.
export function getAuthClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

// Verify a Bearer token and return the Supabase auth user (or null).
// Network blips must not throw — uncaught fetch errors used to bubble as
// opaque 500s on every API route (e.g. /api/office/communications).
export async function verifyAccessToken(accessToken: string) {
  try {
    const client = getAuthClient();
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    console.error(
      "[auth_verify_access_token_failed]",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
