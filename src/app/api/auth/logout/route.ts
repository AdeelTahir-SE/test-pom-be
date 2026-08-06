import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { clearAuthCookies, readAccessToken } from "@/lib/auth/cookies";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — invalidates the session and clears auth cookies.
export async function POST(request: Request) {
  try {
    const token = readAccessToken(request);
    const db = getAdminClient();

    if (token) {
      const { error } = await db.auth.admin.signOut(token, "global");
      if (error) {
        console.error("[logout_signout_failed]", error.message);
      }
    }

    const response = ok({ success: true });
    clearAuthCookies(response);
    return response;
  } catch (err) {
    const response = toErrorResponse(err);
    clearAuthCookies(response);
    return response;
  }
}
