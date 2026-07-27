import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { createTimelineEvent } from "@/lib/timeline/events";
import { notifyUser } from "@/lib/services/notifications";
import { JOB_STATUSES, type JobStatus } from "@/config/constants";
import { assertValidWorker } from "@/lib/services/jobs";

export const dynamic = "force-dynamic";

// GET /api/jobs/[id] — owner/manager: any job in their company.
// Worker: only a job assigned to them (§11 Cross-Worker Rule, §33 Worker Scope Limitation).
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();

  const { data: job, error } = await db
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (error) throw new ApiError("internal", "Failed to load job.", error.message);
  if (!job) throw new ApiError("not_found", "Job not found.");

  const { data: assignment } = await db
    .from("job_assignments")
    .select("worker_id")
    .eq("job_id", job.id)
    .maybeSingle();
  const workerId = assignment?.worker_id ?? null;

  if (auth.role === "worker" && workerId !== auth.userId) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  // Soft-hidden cards stay readable for office audit; workers lose access.
  if (auth.role === "worker" && job.hidden_at) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  return ok({ job: { ...job, worker_id: workerId } });
});

const jobStatusEnum = z.enum(JOB_STATUSES as unknown as [string, ...string[]]);

const managerUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    priority: z.string().trim().nullable().optional(),
    customer: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    scheduled_at: z.string().datetime().nullable().optional(),
    worker_id: z.string().uuid().nullable().optional(),
    status: jobStatusEnum.optional(),
    metadata: z.record(z.unknown()).optional(),
    display_order: z.number().int().min(0).optional(),
    /** Soft-hide from boards — row + timeline/files/messages stay (Mark task 4). */
    hidden: z.literal(true).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided.",
  });

// Workers may ONLY update status (Mobile Actions §36) — .strict() rejects
// any other field outright rather than silently ignoring it.
const workerUpdateSchema = z.object({ status: jobStatusEnum }).strict();

// Fixed universal lifecycle (§9-10): standard flow pending -> in_progress ->
// waiting -> completed; cancelled may happen from any non-terminal state.
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Workers execute work, not cancel it — cancellation stays owner/manager only.
const WORKER_ALLOWED_STATUSES: JobStatus[] = ["in_progress", "waiting", "completed"];

const MANAGER_EDITABLE_FIELDS = [
  "title",
  "description",
  "priority",
  "customer",
  "location",
  "scheduled_at",
  "metadata",
  "display_order",
] as const;

// PATCH /api/jobs/[id] — owner/manager: any field + reassignment + any valid
// transition. Worker: status only, on a job assigned to them, within the
// worker-allowed subset of transitions.
export const PATCH = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (jobError) throw new ApiError("internal", "Failed to load job.", jobError.message);
  if (!job) throw new ApiError("not_found", "Job not found.");

  const { data: assignmentRow } = await db
    .from("job_assignments")
    .select("worker_id")
    .eq("job_id", job.id)
    .maybeSingle();
  const currentWorkerId: string | null = assignmentRow?.worker_id ?? null;
  const currentStatus = job.status as JobStatus;
  const isWorker = auth.role === "worker";

  if (isWorker && currentWorkerId !== auth.userId) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  // Soft-hidden jobs are archived from active boards; workers cannot act on them.
  if (isWorker && job.hidden_at) {
    throw new ApiError("forbidden", "You do not have access to this job.");
  }

  const input = isWorker
    ? await parseJsonBody(request, workerUpdateSchema)
    : await parseJsonBody(request, managerUpdateSchema);

  const hideOnly =
    !isWorker &&
    (input as { hidden?: true }).hidden === true &&
    Object.keys(input).length === 1;

  // Completed Jobs are historical records — nothing may change (Immutability Rule §60),
  // except soft-hide which only archives the card from boards without altering work data.
  if (currentStatus === "completed" && !hideOnly) {
    throw new ApiError("conflict", "This job is completed and cannot be modified.");
  }

  const updates: Record<string, unknown> = {};

  if (!isWorker && (input as z.infer<typeof managerUpdateSchema>).hidden === true) {
    if (!job.hidden_at) {
      updates.hidden_at = new Date().toISOString();
      updates.hidden_by = auth.userId;
    }
  }

  if (input.status && input.status !== currentStatus) {
    if (isWorker && !WORKER_ALLOWED_STATUSES.includes(input.status as JobStatus)) {
      throw new ApiError("forbidden", "Workers cannot set this status.");
    }
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(input.status as JobStatus)) {
      throw new ApiError(
        "conflict",
        `Cannot transition job from ${currentStatus} to ${input.status}.`
      );
    }
    updates.status = input.status;
    if (input.status === "in_progress" && !job.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (input.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
  }

  if (!isWorker) {
    const managerInput = input as z.infer<typeof managerUpdateSchema>;
    for (const field of MANAGER_EDITABLE_FIELDS) {
      if (managerInput[field] !== undefined) {
        updates[field] = managerInput[field];
      }
    }

    if (managerInput.worker_id !== undefined && managerInput.worker_id !== currentWorkerId) {
      let assignedWorkerName: string | null = null;
      if (managerInput.worker_id === null) {
        await db.from("job_assignments").delete().eq("job_id", job.id);
      } else {
        const worker = await assertValidWorker(db, auth.companyId, managerInput.worker_id);
        assignedWorkerName = worker.full_name;
        const { error: assignError } = await db.from("job_assignments").upsert(
          {
            company_id: auth.companyId,
            job_id: job.id,
            worker_id: managerInput.worker_id,
            assigned_by: auth.userId,
          },
          { onConflict: "job_id" }
        );
        if (assignError) {
          throw new ApiError("internal", "Failed to reassign worker.", assignError.message);
        }
      }
      await createTimelineEvent(db, {
        companyId: auth.companyId,
        jobId: job.id,
        eventType: "worker_assigned",
        userId: auth.userId,
        metadata: { worker_id: managerInput.worker_id, worker_name: assignedWorkerName, job_seq: job.company_seq },
      });
      if (managerInput.worker_id) {
        // Quick Reaction Event (§25): job assigned -> notify worker.
        await notifyUser(db, {
          companyId: auth.companyId,
          userId: managerInput.worker_id,
          type: "job_assigned",
          title: "You have been assigned to a job",
          body: job.title,
          jobId: job.id,
        });
      }
    }
  }

  let updatedJob = job;
  if (Object.keys(updates).length > 0) {
    const { data, error: updateError } = await db
      .from("jobs")
      .update(updates)
      .eq("id", job.id)
      .select()
      .single();
    if (updateError || !data) {
      throw new ApiError("internal", "Failed to update job.", updateError?.message);
    }
    updatedJob = data;

    if (updates.status) {
      await createTimelineEvent(db, {
        companyId: auth.companyId,
        jobId: job.id,
        eventType: updates.status === "completed" ? "job_completed" : "status_changed",
        userId: auth.userId,
        metadata: { from: currentStatus, to: updates.status },
      });
      if (updates.status === "completed") {
        // Quick Reaction Event (§25): job completed -> notify dispatcher/owner
        // (the job's creator, standing in for "the office").
        await notifyUser(db, {
          companyId: auth.companyId,
          userId: job.created_by,
          type: "job_completed",
          title: "Job completed",
          body: job.title,
          jobId: job.id,
        });
      }
    }

    if (updates.hidden_at) {
      // Soft-hide audit (closed event set — reuse job_updated with hidden flag).
      await createTimelineEvent(db, {
        companyId: auth.companyId,
        jobId: job.id,
        eventType: "job_updated",
        userId: auth.userId,
        metadata: {
          hidden: true,
          job_seq: job.company_seq,
          title: job.title,
        },
      });
    }

    const nonStatusFieldsChanged = Object.keys(updates).some(
      (k) =>
        k !== "status" &&
        k !== "started_at" &&
        k !== "completed_at" &&
        k !== "hidden_at" &&
        k !== "hidden_by"
    );
    if (nonStatusFieldsChanged) {
      await createTimelineEvent(db, {
        companyId: auth.companyId,
        jobId: job.id,
        eventType: "job_updated",
        userId: auth.userId,
        metadata: {},
      });
    }
  }

  const { data: finalAssignment } = await db
    .from("job_assignments")
    .select("worker_id")
    .eq("job_id", job.id)
    .maybeSingle();

  return ok({ job: { ...updatedJob, worker_id: finalAssignment?.worker_id ?? null } });
});
