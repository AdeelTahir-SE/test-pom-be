import { z } from "zod";
import { withPlatformAdmin } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// GET /api/admin/companies/[id] — platform-admin-only, cross-tenant, read-only.
export const GET = withPlatformAdmin<{ id: string }>(async (_request, _auth, { params }) => {
  const db = getAdminClient();
  const companyId = params.id;

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, business_module, subscription_active, created_at")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) {
    throw new ApiError("internal", "Failed to load company.", companyError.message);
  }
  if (!company) {
    throw new ApiError("not_found", "Company not found.");
  }

  const { data: users, error: usersError } = await db
    .from("users")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (usersError) {
    throw new ApiError("internal", "Failed to load company users.", usersError.message);
  }

  const { count: jobCount, error: jobsError } = await db
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (jobsError) {
    throw new ApiError("internal", "Failed to load job count.", jobsError.message);
  }

  return ok({ company, users: users ?? [], job_count: jobCount ?? 0 });
});

const updateCompanySchema = z.object({
  subscription_active: z.boolean(),
});

// PATCH /api/admin/companies/[id] — platform-admin-only. Currently the only
// admin-mutable field on a company is its subscription status.
export const PATCH = withPlatformAdmin<{ id: string }>(async (request, _auth, { params }) => {
  const input = await parseJsonBody(request, updateCompanySchema);
  const db = getAdminClient();

  const { data: company, error } = await db
    .from("companies")
    .update({ subscription_active: input.subscription_active })
    .eq("id", params.id)
    .select("id, name, business_module, subscription_active, created_at")
    .maybeSingle();

  if (error) {
    throw new ApiError("internal", "Failed to update company.", error.message);
  }
  if (!company) {
    throw new ApiError("not_found", "Company not found.");
  }

  return ok({ company });
});
