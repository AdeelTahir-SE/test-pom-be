import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { createTimelineEvent } from "@/lib/timeline/events";
import { notifyUser } from "@/lib/services/notifications";
import { findOrCreateCustomer } from "@/lib/services/customers";
import { JOB_STATUSES } from "@/config/constants";
import { assertValidWorker } from "@/lib/services/jobs";
import { isScheduledAtInPast, isoToAppDayKey } from "@/lib/officeDate";

export const dynamic = "force-dynamic";

const createJobSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().min(1).optional(),
  priority: z.string().trim().min(1).optional(),
  customer: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  scheduled_at: z.string().datetime().optional(),
  worker_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/jobs — default order scheduled_at ASC, created_at DESC (Appendix A §7).
// Owner/manager see all company jobs; workers see only jobs assigned to them (§11, §33).
export const GET = withAuth(async (request, auth) => {
  const db = getAdminClient();
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  if (statusFilter && !(JOB_STATUSES as readonly string[]).includes(statusFilter)) {
    throw new ApiError("bad_request", "Invalid status filter.");
  }

  let workerJobIds: string[] | null = null;
  if (auth.role === "worker") {
    const { data: assignments, error: assignError } = await db
      .from("job_assignments")
      .select("job_id")
      .eq("worker_id", auth.userId);
    if (assignError) {
      throw new ApiError("internal", "Failed to load assignments.", assignError.message);
    }
    workerJobIds = (assignments ?? []).map((a) => a.job_id);
    if (workerJobIds.length === 0) {
      return ok({ jobs: [] });
    }
  }

  // display_order (manual drag-and-drop) wins when set; jobs nobody has
  // reordered (null) fall back to the original scheduled_at/created_at rule.
  // Soft-hidden jobs stay in the DB (and timeline) but are omitted from the
  // active board unless include_hidden=true (owner/manager audit access).
  const includeHidden =
    url.searchParams.get("include_hidden") === "true" &&
    (auth.role === "owner" || auth.role === "manager");

  let query = db
    .from("jobs")
    .select("*")
    .eq("company_id", auth.companyId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!includeHidden) query = query.is("hidden_at", null);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (workerJobIds) query = query.in("id", workerJobIds);

  const { data: jobs, error: jobsError } = await query;
  if (jobsError) {
    throw new ApiError("internal", "Failed to load jobs.", jobsError.message);
  }

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: assignments, error: assignmentsError } =
    jobIds.length > 0
      ? await db.from("job_assignments").select("job_id, worker_id").in("job_id", jobIds)
      : { data: [] as { job_id: string; worker_id: string }[], error: null };
  if (assignmentsError) {
    throw new ApiError("internal", "Failed to load assignments.", assignmentsError.message);
  }

  const workerByJobId = new Map((assignments ?? []).map((a) => [a.job_id, a.worker_id]));
  const result = (jobs ?? []).map((j) => ({ ...j, worker_id: workerByJobId.get(j.id) ?? null }));

  return ok({ jobs: result });
});

// POST /api/jobs — owner/manager create a Job (universal work item, spec Part 6).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createJobSchema);
    const db = getAdminClient();

    if (input.scheduled_at && isScheduledAtInPast(input.scheduled_at)) {
      throw new ApiError(
        "bad_request",
        "Scheduled date cannot be in the past. Use today or a future date."
      );
    }

    // Persist customer exactly as entered (trim/collapse spaces only) and
    // ensure a distinct customers row — similar names stay different customers.
    const customerName = input.customer
      ? input.customer.trim().replace(/\s+/g, " ")
      : null;
    if (customerName) {
      await findOrCreateCustomer(db, auth.companyId, customerName);
    }

    let assignedWorkerName: string | null = null;
    if (input.worker_id) {
      const worker = await assertValidWorker(db, auth.companyId, input.worker_id);
      assignedWorkerName = worker.full_name;
    }

    const { data: job, error: jobError } = await db
      .from("jobs")
      .insert({
        company_id: auth.companyId,
        created_by: auth.userId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? null,
        customer: customerName,
        location: input.location ?? null,
        scheduled_at: input.scheduled_at ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new ApiError("internal", "Failed to create job.", jobError?.message);
    }

    const { data: creator } = await db
      .from("users")
      .select("full_name")
      .eq("id", auth.userId)
      .maybeSingle();

    const createdOn =
      isoToAppDayKey(job.created_at) ?? isoToAppDayKey(new Date().toISOString());

    // One create event (include worker when assigned at create) — avoids the
    // near-duplicate job_created + worker_assigned pair on the card timeline.
    await createTimelineEvent(db, {
      companyId: auth.companyId,
      jobId: job.id,
      eventType: "job_created",
      userId: auth.userId,
      metadata: {
        title: job.title,
        job_seq: job.company_seq,
        created_on: createdOn,
        ...(creator?.full_name ? { created_by_name: creator.full_name } : {}),
        ...(assignedWorkerName ? { worker_name: assignedWorkerName } : {}),
        ...(input.worker_id ? { worker_id: input.worker_id } : {}),
      },
    });

    if (input.worker_id) {
      const { error: assignError } = await db.from("job_assignments").insert({
        company_id: auth.companyId,
        job_id: job.id,
        worker_id: input.worker_id,
        assigned_by: auth.userId,
      });
      if (assignError) {
        throw new ApiError("internal", "Job created but assignment failed.", assignError.message);
      }
      // Quick Reaction Event (§25): job assigned -> notify worker.
      await notifyUser(db, {
        companyId: auth.companyId,
        userId: input.worker_id,
        type: "job_assigned",
        title: "You have been assigned to a job",
        body: job.title,
        jobId: job.id,
      });
    }

    return created({ job: { ...job, worker_id: input.worker_id ?? null } });
  },
  { roles: ["owner", "manager"] }
);
