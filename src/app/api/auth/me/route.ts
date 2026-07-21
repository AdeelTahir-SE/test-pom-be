import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface OfficeContact {
  full_name: string;
  email: string | null;
  phone: string | null;
}

// GET /api/auth/me — requires an active company user. A platform admin
// token is rejected here by construction (withAuth only accepts company_user).
// Also returns office_contact (owner first, else first manager) so workers
// can one-tap call / email the office without hardcoded demo numbers.
export const GET = withAuth(async (_request, auth) => {
  const db = getAdminClient();

  const { data: userRow, error: userError } = await db
    .from("users")
    .select("id, email, full_name, role, phone, is_active, created_at")
    .eq("id", auth.userId)
    .single();
  if (userError || !userRow) {
    throw new ApiError("not_found", "User not found.");
  }

  const { data: company, error: companyError } = await db
    .from("companies")
    .select(
      "id, name, business_module, subscription_active, stripe_customer_id, stripe_subscription_id, subscription_status"
    )
    .eq("id", auth.companyId)
    .single();
  if (companyError || !company) {
    throw new ApiError("not_found", "Company not found.");
  }

  const { data: owner } = await db
    .from("users")
    .select("full_name, email, phone")
    .eq("company_id", auth.companyId)
    .eq("role", "owner")
    .eq("is_active", true)
    .maybeSingle();

  let office_contact: OfficeContact | null = owner
    ? { full_name: owner.full_name, email: owner.email, phone: owner.phone }
    : null;

  if (!office_contact) {
    const { data: manager } = await db
      .from("users")
      .select("full_name, email, phone")
      .eq("company_id", auth.companyId)
      .eq("role", "manager")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (manager) {
      office_contact = {
        full_name: manager.full_name,
        email: manager.email,
        phone: manager.phone,
      };
    }
  }

  return ok({ user: userRow, company, office_contact });
});
