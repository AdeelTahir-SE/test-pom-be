import { created, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody, googleRegisterSchema } from "@/lib/validation/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyAccessToken } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

type CompanyWithOwnerResult = {
  user: { id: string; email: string; full_name: string; role: string };
  company: { id: string; name: string; business_module: string };
};

// POST /api/auth/register/google — step 2 after Google OAuth for users who
// do not yet have a public.users / company row. Requires the Bearer token
// from /api/auth/oauth/callback (needs_registration: true).
// Session tokens stay with the client from OAuth step 1 — this endpoint
// only returns application data (user + company).
export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      throw new ApiError("unauthorized", "Missing or invalid authentication.");
    }

    const authUser = await verifyAccessToken(token);
    if (!authUser?.email) {
      throw new ApiError("unauthorized", "Missing or invalid authentication.");
    }

    const input = await parseJsonBody(request, googleRegisterSchema);
    const db = getAdminClient();

    const meta = authUser.user_metadata ?? {};
    const metaName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      "";
    const fullName =
      input.full_name?.trim() ||
      metaName ||
      authUser.email.split("@")[0]!;

    const { data, error } = await db.rpc("create_company_with_owner", {
      p_user_id: authUser.id,
      p_email: authUser.email,
      p_full_name: fullName,
      p_company_name: input.company_name,
      p_business_module: input.business_module,
    });

    if (error) {
      const message = error.message ?? "";
      if (/USER_ALREADY_REGISTERED/i.test(message)) {
        throw new ApiError("conflict", "This Google account is already registered with a company.");
      }
      if (/PLATFORM_ADMIN_FORBIDDEN/i.test(message)) {
        throw new ApiError(
          "forbidden",
          "Platform admin accounts cannot register a company this way."
        );
      }
      throw new ApiError("internal", "Failed to complete Google registration.", message);
    }

    const result = data as CompanyWithOwnerResult | null;
    if (!result?.user || !result?.company) {
      throw new ApiError("internal", "Failed to complete Google registration.");
    }

    return created({
      user: result.user,
      company: result.company,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
