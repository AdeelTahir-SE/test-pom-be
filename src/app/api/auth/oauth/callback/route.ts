import { z } from "zod";
import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const callbackSchema = z.object({
  code: z.string().min(1, "Manjka OAuth koda."),
});

function googleFullName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  if (fromMeta) return fromMeta;
  const email = user.email?.trim();
  if (!email) return null;
  return email.split("@")[0] ?? null;
}

// POST /api/auth/oauth/callback — exchanges Google (or other) OAuth code for
// our app session tokens, then returns the same shape as /api/auth/login.
// New Google users (no public.users row yet) get needs_registration: true so
// the client can finish company setup via POST /api/auth/register/google.
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, callbackSchema);
    const authClient = getAuthClient();

    const { data, error } = await authClient.auth.exchangeCodeForSession(input.code);
    if (error || !data.session || !data.user) {
      throw new ApiError(
        "unauthorized",
        "Prijava z Googlom ni uspela. Poskusite znova."
      );
    }

    const db = getAdminClient();
    const { data: companyUser } = await db
      .from("users")
      .select("id, company_id, role, email, full_name, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (companyUser && !companyUser.is_active) {
      throw new ApiError("forbidden", "Ta račun je bil deaktiviran.");
    }

    if (!companyUser) {
      const { data: admin } = await db
        .from("platform_admins")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!admin) {
        // Step 1 of Google registration: auth identity exists, company not yet.
        return ok({
          needs_registration: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          user: {
            id: data.user.id,
            email: data.user.email ?? "",
            full_name: googleFullName(data.user) ?? undefined,
          },
          company_id: null,
        });
      }
    }

    return ok({
      needs_registration: false,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: companyUser
        ? {
            id: companyUser.id,
            email: companyUser.email,
            full_name: companyUser.full_name,
            role: companyUser.role,
          }
        : { id: data.user.id, email: data.user.email },
      company_id: companyUser?.company_id ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
