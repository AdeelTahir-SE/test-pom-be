import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

// POST /api/auth/logout — invalidates the current session (any authenticated
// identity: company user or platform admin). Not routed through withAuth
// since it must work for both identity kinds without granting either extra access.
export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      throw new ApiError("unauthorized", "Missing bearer token.");
    }
    const db = getAdminClient();
    const { error } = await db.auth.admin.signOut(token, "global");
    if (error) {
      throw new ApiError("unauthorized", "Invalid or expired session.");
    }
    return ok({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
