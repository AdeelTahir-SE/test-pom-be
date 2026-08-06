import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { isTransientNetworkError } from "@/lib/http/transient";
import {
  clearRateLimit,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  type RateLimitBucket,
} from "@/lib/http/rateLimit";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { parseJsonBody, loginSchema } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const loginAttempts = new Map<string, RateLimitBucket>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/login — email/password -> httpOnly session cookies.
// JSON body returns user profile only (tokens are not exposed to JS).
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(loginAttempts, ip, MAX_ATTEMPTS)) {
      throw new ApiError(
        "too_many_requests",
        "Too many login attempts. Please try again later."
      );
    }

    const input = await parseJsonBody(request, loginSchema);
    const authClient = getAuthClient();

    const { data: session, error: signInError } =
      await authClient.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (signInError) {
      if (isTransientNetworkError(signInError)) {
        throw new ApiError(
          "internal",
          "Temporary connection problem. Please retry in a moment.",
          signInError.message
        );
      }
      recordFailedAttempt(loginAttempts, ip, WINDOW_MS);
      throw new ApiError("unauthorized", "Napačen e-naslov ali geslo.");
    }
    if (!session.session || !session.user) {
      recordFailedAttempt(loginAttempts, ip, WINDOW_MS);
      throw new ApiError("unauthorized", "Napačen e-naslov ali geslo.");
    }

    const db = getAdminClient();
    const { data: companyUser, error: dbError } = await db
      .from("users")
      .select("id, company_id, role, email, full_name, is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (dbError) {
      throw new ApiError("internal", "Database error.", dbError.message);
    }

    if (companyUser && !companyUser.is_active) {
      // Attempt to revoke the session before rejecting.
      // supabase-js admin.signOut expects the user's JWT, not the user id.
      await db.auth.admin
        .signOut(session.session.access_token, "global")
        .catch((err) => {
          console.error(
            "[login_revoke_inactive_failed]",
            err instanceof Error ? err.message : String(err)
          );
        });
      recordFailedAttempt(loginAttempts, ip, WINDOW_MS);
      throw new ApiError("forbidden", "Ta račun je bil deaktiviran.");
    }

    if (!companyUser) {
      const { data: platformAdmin, error: adminError } = await db
        .from("platform_admins")
        .select("id, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (adminError) {
        throw new ApiError("internal", "Database error.", adminError.message);
      }
      if (!platformAdmin) {
        recordFailedAttempt(loginAttempts, ip, WINDOW_MS);
        throw new ApiError("unauthorized", "Račun ni najden v sistemu.");
      }

      clearRateLimit(loginAttempts, ip);
      const response = ok({
        expires_in: session.session.expires_in,
        user: {
          id: platformAdmin.id,
          email: platformAdmin.email,
        },
        company_id: null,
      });
      applyAuthCookies(response, session.session);
      return response;
    }

    clearRateLimit(loginAttempts, ip);

    const response = ok({
      expires_in: session.session.expires_in,
      user: {
        id: companyUser.id,
        email: companyUser.email,
        full_name: companyUser.full_name,
        role: companyUser.role,
      },
      company_id: companyUser.company_id ?? null,
    });
    applyAuthCookies(response, session.session);
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
