import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolveOfficeContact } from "@/lib/services/officeContact";

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
      "id, name, business_module, subscription_active, stripe_customer_id, stripe_subscription_id, subscription_status, created_at"
    )
    .eq("id", auth.companyId)
    .single();
  if (companyError || !company) {
    throw new ApiError("not_found", "Company not found.");
  }

  const contact = await resolveOfficeContact(db, auth.companyId);
  const office_contact: OfficeContact | null = contact
    ? { full_name: contact.full_name, email: contact.email, phone: contact.phone }
    : null;

  return ok({ user: userRow, company, office_contact });
});
