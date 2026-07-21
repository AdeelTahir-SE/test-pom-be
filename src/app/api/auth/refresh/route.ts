import { z } from "zod";
import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const refreshSchema = z.object({
  refresh_token: z.string().min(1, "refresh_token is required."),
});

// POST /api/auth/refresh — exchanges a still-valid refresh token for a new
// access token, so a session survives past the 1-hour access token expiry
// without forcing a re-login.
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, refreshSchema);
    const authClient = getAuthClient();

    const { data: session, error } = await authClient.auth.refreshSession({
      refresh_token: input.refresh_token,
    });

    if (error || !session.session) {
      throw new ApiError("unauthorized", "Session expired. Please log in again.");
    }

    return ok({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      expires_in: session.session.expires_in,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
