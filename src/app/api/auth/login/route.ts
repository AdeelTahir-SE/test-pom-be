import { ok, ApiError, toErrorResponse } from "@/lib/http/responses";
import { parseJsonBody, loginSchema } from "@/lib/validation/schemas";
import { getAuthClient } from "@/lib/supabase/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/auth/login — email/password -> JWT session.
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, loginSchema);
    const authClient = getAuthClient();

    const { data: session, error: signInError } = await authClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError || !session.session || !session.user) {
      throw new ApiError("unauthorized", "Napačen e-naslov ali geslo.");
    }

    const db = getAdminClient();
    const { data: companyUser } = await db
      .from("users")
      .select("id, company_id, role, email, full_name, is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    // Inactive company users must not receive a usable session (spec: inactive -> 403).
    if (companyUser && !companyUser.is_active) {
      await db.auth.admin.signOut(session.session.access_token, "global").catch(() => {});
      throw new ApiError("forbidden", "Ta račun je bil deaktiviran.");
    }

    return ok({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      expires_in: session.session.expires_in,
      user: companyUser
        ? {
            id: companyUser.id,
            email: companyUser.email,
            full_name: companyUser.full_name,
            role: companyUser.role,
          }
        : { id: session.user.id, email: session.user.email },
      company_id: companyUser?.company_id ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
