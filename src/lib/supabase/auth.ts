import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/responses";
import { isTransientNetworkError } from "@/lib/http/transient";

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

function throwIfTransientAuthNetwork(err: unknown): never | void {
  if (!isTransientNetworkError(err)) return;
  const message = err instanceof Error ? err.message : String(err);
  console.error("[auth_supabase_network_failed]", message);
  throw new ApiError(
    "internal",
    "Temporary connection problem. Please retry in a moment.",
    message
  );
}

// Verify a Bearer token and return the Supabase auth user (or null).
// Real invalid tokens → null (401). Network blips → ApiError (500) so clients
// do not treat connectivity failure as "logged out".
export async function verifyAccessToken(accessToken: string) {
  try {
    const client = getAuthClient();
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) {
      throwIfTransientAuthNetwork(error);
      return null;
    }
    if (!data.user) return null;
    return data.user;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throwIfTransientAuthNetwork(err);
    console.error(
      "[auth_verify_access_token_failed]",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
