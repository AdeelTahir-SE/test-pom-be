import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { isTransientNetworkError } from "@/lib/http/transient";
import {
  clearRateLimit,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  type RateLimitBucket,
} from "@/lib/http/rateLimit";
import {
  applyAuthCookies,
  clearAuthCookies,
  readRefreshToken,
} from "@/lib/auth/cookies";
import { getAuthClient } from "@/lib/supabase/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

const refreshAttempts = new Map<string, RateLimitBucket>();
const MAX_ATTEMPTS = 30;
const WINDOW_MS = 60 * 1000; // 1 minute

const refreshBodySchema = z.object({
  refresh_token: z.string().min(1).optional(),
});

// POST /api/auth/refresh — cookie (or legacy body) refresh_token -> new cookies.
// Keeps the session alive past the ~1h access token TTL.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(refreshAttempts, ip, MAX_ATTEMPTS)) {
      throw new ApiError(
        "too_many_requests",
        "Preveč neuspešnih poizkusov osvežitve. Poskusite znova kasneje."
      );
    }

    let bodyToken: string | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const parsed = await parseJsonBody(request, refreshBodySchema);
        bodyToken = parsed.refresh_token;
      } catch {
        // Empty / invalid body — fall through to cookie.
      }
    }

    const refreshToken = bodyToken || readRefreshToken(request);
    if (!refreshToken) {
      throw new ApiError("unauthorized", "Manjkajoča seja. Prijavite se znova.");
    }

    const authClient = getAuthClient();
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      if (isTransientNetworkError(error)) {
        throw new ApiError(
          "internal",
          "Začasna težava s povezavo. Poskusite znova čez trenutek.",
          error.message
        );
      }
      recordFailedAttempt(refreshAttempts, ip, WINDOW_MS);
      throw new ApiError("unauthorized", "Seja je potekla. Prijavite se znova.");
    }

    if (!data.session || !data.user) {
      recordFailedAttempt(refreshAttempts, ip, WINDOW_MS);
      throw new ApiError("unauthorized", "Seja je potekla. Prijavite se znova.");
    }

    const db = getAdminClient();
    const { data: companyUser, error: dbError } = await db
      .from("users")
      .select("id, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (dbError) {
      throw new ApiError("internal", "Napaka v bazi.", dbError.message);
    }

    if (companyUser && !companyUser.is_active) {
      await db.auth.admin
        .signOut(data.session.access_token, "global")
        .catch((err) => {
          console.error(
            "[refresh_revoke_inactive_failed]",
            err instanceof Error ? err.message : String(err)
          );
        });
      const response = toErrorResponse(
        new ApiError("forbidden", "Ta račun je bil deaktiviran.")
      );
      clearAuthCookies(response);
      return response;
    }

    if (!companyUser) {
      const { data: platformAdmin, error: adminError } = await db
        .from("platform_admins")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (adminError) {
        throw new ApiError("internal", "Napaka v bazi.", adminError.message);
      }
      if (!platformAdmin) {
        recordFailedAttempt(refreshAttempts, ip, WINDOW_MS);
        throw new ApiError("unauthorized", "Račun ni najden v sistemu.");
      }
    }

    clearRateLimit(refreshAttempts, ip);

    const response = ok({
      expires_in: data.session.expires_in,
    });
    applyAuthCookies(response, data.session);
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
