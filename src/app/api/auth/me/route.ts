import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/auth/me — requires an active company user. A platform admin
// token is rejected here by construction (withAuth only accepts company_user).
export const GET = withAuth(async (_request, auth) => {
  const db = getAdminClient();

  const { data: userRow, error: userError } = await db
    .from("users")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("id", auth.userId)
    .single();
  if (userError || !userRow) {
    throw new ApiError("not_found", "User not found.");
  }

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, business_module, subscription_active")
    .eq("id", auth.companyId)
    .single();
  if (companyError || !company) {
    throw new ApiError("not_found", "Company not found.");
  }

  return ok({ user: userRow, company });
});
