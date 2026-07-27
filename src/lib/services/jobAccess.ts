import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/responses";
import type { CompanyUserContext } from "@/types/domain";

export interface JobAccessResult {
  job: Record<string, unknown> & { id: string; status: string };
  workerId: string | null;
}

// Shared job-scoped access check for every endpoint that hangs off a Job
// (checklist, timeline, files, messages): company isolation, then — for
// workers — restrict to the job assigned to them (§11 Cross-Worker Rule,
// §33 Worker Scope Limitation).
export async function loadJobWithAccess(
  db: SupabaseClient,
  auth: CompanyUserContext,
  jobId: string
): Promise<JobAccessResult> {
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (jobError) throw new ApiError("internal", "Failed to load job.", jobError.message);
  if (!job) throw new ApiError("not_found", "Job not found.");

  const { data: assignment } = await db
    .from("job_assignments")
    .select("worker_id")
    .eq("job_id", jobId)
    .maybeSingle();
  const workerId = assignment?.worker_id ?? null;

  if (auth.role === "worker" && workerId !== auth.userId) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  // Soft-hidden from office board — workers lose active access; office keeps
  // timeline/files/messages for audit (loadJobWithAccess used by those routes).
  if (auth.role === "worker" && job.hidden_at) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  return { job: job as JobAccessResult["job"], workerId };
}
