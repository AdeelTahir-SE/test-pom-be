import { z } from "zod";
import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const callbackSchema = z.object({
  code: z.string().min(1, "Manjka OAuth koda."),
});

// POST /api/auth/oauth/callback — exchanges Google (or other) OAuth code for
// our app session tokens, then returns the same shape as /api/auth/login.
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

    // Google sign-in is for existing company users / platform admins only —
    // there is no auto-register path (company creation stays on /register).
    if (!companyUser) {
      const { data: admin } = await db
        .from("platform_admins")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!admin) {
        throw new ApiError(
          "forbidden",
          "Račun z Googlom ni povezan s podjetjem. Najprej se registrirajte z e-pošto."
        );
      }
    }

    return ok({
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
