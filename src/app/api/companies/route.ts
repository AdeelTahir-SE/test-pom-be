import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// business_module is deliberately not editable here — it's fixed at
// registration (Registration Flow §12) and module-specific behavior assumes
// it never changes after the fact.
const updateCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required."),
});

// PATCH /api/companies — owner-only self-service rename of their own company.
// Distinct from /api/admin/companies/[id], which is platform-admin-only and
// cross-tenant.
export const PATCH = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, updateCompanySchema);
    const db = getAdminClient();

    const { data: company, error } = await db
      .from("companies")
      .update({ name: input.name })
      .eq("id", auth.companyId)
      .select("id, name, business_module, subscription_active")
      .maybeSingle();

    if (error) {
      throw new ApiError("internal", "Failed to update company.", error.message);
    }
    if (!company) {
      throw new ApiError("not_found", "Company not found.");
    }

    return ok({ company });
  },
  { roles: ["owner"] }
);
