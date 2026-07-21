import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";

// A Job may only be assigned to an active worker in the same company
// (spec §11 Job Ownership: "exactly one assigned worker").
export async function assertValidWorker(
  db: SupabaseClient,
  companyId: string,
  workerId: string
): Promise<{ full_name: string }> {
  const { data, error } = await db
    .from("users")
    .select("id, role, is_active, full_name")
    .eq("id", workerId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to validate worker.", error.message);
  }
  if (!data || data.role !== "worker" || !data.is_active) {
    throw new ApiError("bad_request", "worker_id must reference an active worker in your company.");
  }
  return { full_name: data.full_name };
}
