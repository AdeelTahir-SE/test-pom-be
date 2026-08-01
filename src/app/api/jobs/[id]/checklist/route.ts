import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_JOB_IDS = 100;

function parseJobIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const unique = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (UUID_RE.test(id)) unique.add(id);
  }
  return [...unique];
}

// GET /api/jobs/checklists?ids=uuid,uuid,... — bulk checklist fetch for the
// office board (one round-trip instead of N × /api/jobs/[id]/checklist).
export const GET = withAuth(async (request, auth) => {
  const db = getAdminClient();
  const requestedIds = parseJobIds(new URL(request.url).searchParams.get("ids"));

  if (requestedIds.length === 0) {
    return ok({ checklistsByJob: {} as Record<string, unknown[]> });
  }
  if (requestedIds.length > MAX_JOB_IDS) {
    throw new ApiError("bad_request", `At most ${MAX_JOB_IDS} job ids per request.`);
  }

  let allowedJobIds: string[];

  if (auth.role === "worker") {
    const { data: companyJobs, error: companyJobsError } = await db
      .from("jobs")
      .select("id")
      .eq("company_id", auth.companyId)
      .in("id", requestedIds);
    if (companyJobsError) {
      throw new ApiError("internal", "Failed to load jobs.", companyJobsError.message);
    }
    const companyJobIds = (companyJobs ?? []).map((j) => j.id);
    if (companyJobIds.length === 0) {
      return ok({ checklistsByJob: {} });
    }

    const { data: assignments, error: assignError } = await db
      .from("job_assignments")
      .select("job_id")
      .eq("worker_id", auth.userId)
      .in("job_id", companyJobIds);
    if (assignError) {
      throw new ApiError("internal", "Failed to load assignments.", assignError.message);
    }
    allowedJobIds = (assignments ?? []).map((a) => a.job_id);
  } else {
    const { data: jobs, error: jobsError } = await db
      .from("jobs")
      .select("id")
      .eq("company_id", auth.companyId)
      .in("id", requestedIds);
    if (jobsError) {
      throw new ApiError("internal", "Failed to load jobs.", jobsError.message);
    }
    allowedJobIds = (jobs ?? []).map((j) => j.id);
  }

  if (allowedJobIds.length === 0) {
    return ok({ checklistsByJob: {} });
  }

  const { data: items, error: itemsError } = await db
    .from("job_checklist_items")
    .select("*")
    .in("job_id", allowedJobIds)
    .order("job_id", { ascending: true })
    .order("order_index", { ascending: true });
  if (itemsError) {
    throw new ApiError("internal", "Failed to load checklists.", itemsError.message);
  }

  const { data: fileRows, error: filesError } = await db
    .from("job_files")
    .select("job_id, checklist_item_id")
    .in("job_id", allowedJobIds)
    .is("hidden_at", null);
  if (filesError) {
    throw new ApiError("internal", "Failed to load checklist attachments.", filesError.message);
  }

  const attachmentByJobItem = new Set<string>();

  for (const f of fileRows ?? []) {
    if (f.checklist_item_id) {
      attachmentByJobItem.add(`${f.job_id}:${f.checklist_item_id}`);
    }
  }

  const checklistsByJob: Record<string, Array<Record<string, unknown>>> = {};
  for (const jobId of allowedJobIds) {
    checklistsByJob[jobId] = [];
  }

  for (const item of items ?? []) {
    const jobId = item.job_id as string;
    if (!checklistsByJob[jobId]) checklistsByJob[jobId] = [];
    const hasAttachment = attachmentByJobItem.has(`${jobId}:${item.id}`);
    checklistsByJob[jobId].push({
      ...item,
      has_attachment: hasAttachment,
    });
  }

  return ok({ checklistsByJob });
});
