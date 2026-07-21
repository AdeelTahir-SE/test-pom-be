import { withPlatformAdmin } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/companies — platform-admin-only, cross-tenant, read-only.
// Counts are computed per-company via request-time SQL (no derived storage).
// Deliberately not a single embedded-aggregate select (`users(count)`) —
// PostgREST's to-many count embed behaves like an inner join, silently
// dropping companies that have zero related rows (e.g. a brand-new company
// with no jobs yet). Explicit per-company counts avoid that footgun.
export const GET = withPlatformAdmin(async () => {
  const db = getAdminClient();
  const { data: companies, error } = await db
    .from("companies")
    .select("id, name, business_module, subscription_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError("internal", "Failed to load companies.", error.message);
  }

  const withCounts = await Promise.all(
    (companies ?? []).map(async (company) => {
      const [{ count: userCount }, { count: jobCount }] = await Promise.all([
        db.from("users").select("id", { count: "exact", head: true }).eq("company_id", company.id),
        db.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id),
      ]);
      return {
        ...company,
        user_count: userCount ?? 0,
        job_count: jobCount ?? 0,
      };
    })
  );

  return ok({ companies: withCounts });
});
