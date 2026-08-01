import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { createTimelineEvent } from "@/lib/timeline/events";
import type { CompanyUserContext } from "@/types/domain";

export const dynamic = "force-dynamic";

// Shared by PATCH and DELETE: load the item + its parent job, enforce the
// completed-job lock, and enforce worker-must-be-assigned. Throws ApiError
// on any failure so callers can just await it.
async function loadForMutation(db: SupabaseClient, auth: CompanyUserContext, itemId: string) {
  const { data: item, error: itemError } = await db
    .from("job_checklist_items")
    .select("*")
    .eq("id", itemId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (itemError) throw new ApiError("internal", "Failed to load checklist item.", itemError.message);
  if (!item) throw new ApiError("not_found", "Checklist item not found.");

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, status, company_seq")
    .eq("id", item.job_id)
    .maybeSingle();
  if (jobError || !job) {
    throw new ApiError("internal", "Failed to load parent job.", jobError?.message);
  }

  // Immutability Rule §60: completed Jobs forbid "changing checklist completion".
  if (job.status === "completed") {
    throw new ApiError(
      "conflict",
      "This job is completed and its checklist cannot be modified."
    );
  }

  const isWorker = auth.role === "worker";
  if (isWorker) {
    const { data: assignment } = await db
      .from("job_assignments")
      .select("worker_id")
      .eq("job_id", job.id)
      .maybeSingle();
    if (assignment?.worker_id !== auth.userId) {
      throw new ApiError("forbidden", "You do not have access to this job's checklist.");
    }
  }

  return { item, job, isWorker };
}

/** Only the top incomplete step (lowest order_index) may be completed. */
async function assertIsNextCompletable(
  db: SupabaseClient,
  jobId: string,
  item: { id: string; order_index: number }
) {
  const { data: siblings, error } = await db
    .from("job_checklist_items")
    .select("id, order_index, is_completed")
    .eq("job_id", jobId)
    .order("order_index", { ascending: true });
  if (error) {
    throw new ApiError("internal", "Failed to load checklist order.", error.message);
  }
  const next = (siblings ?? []).find((s) => !s.is_completed);
  if (!next || next.id !== item.id) {
    throw new ApiError(
      "conflict",
      "Only the first incomplete step can be marked done. Move it to the top first."
    );
  }
}

async function assertAttachmentPresentIfRequired(
  db: SupabaseClient,
  jobId: string,
  item: { id: string; requires_attachment: boolean }
) {
  if (!item.requires_attachment) return;
  const { data: file, error } = await db
    .from("job_files")
    .select("id")
    .eq("job_id", jobId)
    .eq("checklist_item_id", item.id)
    .is("hidden_at", null)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to check step attachment.", error.message);
  }
  if (file) return;

  // Recover uploads done via job-level Priponke (+) without a step id:
  // claim the newest unlinked file for this step so complete can proceed.
  
  throw new ApiError(
    "conflict",
    "This step requires an attachment before it can be completed."
  );
}

// Workers may ONLY mark an item complete (Mobile Actions §36 lists "Mark
// checklist item complete", not editing or un-completing) — .strict() plus
// z.literal(true) rejects false or any other field outright.
const workerUpdateSchema = z.object({ is_completed: z.literal(true) }).strict();

// Owner/manager may edit label / order / requires_attachment, and complete —
// but never un-complete (Mark a2: completed stays permanently done).
const managerUpdateSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    order_index: z.number().int().min(0).optional(),
    requires_attachment: z.boolean().optional(),
    is_completed: z.literal(true).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided.",
  });

// PATCH /api/checklist-items/[id] — complete (any assignee) / edit+reorder (owner/manager only).
export const PATCH = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const db = getAdminClient();
  const { item, job, isWorker } = await loadForMutation(db, auth, params.id);

  const input = isWorker
    ? await parseJsonBody(request, workerUpdateSchema)
    : await parseJsonBody(request, managerUpdateSchema);

  if (item.is_completed && input.is_completed === true) {
    // Idempotent no-op complete.
    return ok({ item });
  }

  const updates: Record<string, unknown> = {};
  if (!isWorker) {
    if ("label" in input && input.label !== undefined) updates.label = input.label;
    if ("order_index" in input && input.order_index !== undefined) {
      updates.order_index = input.order_index;
    }
    if ("requires_attachment" in input && input.requires_attachment !== undefined) {
      updates.requires_attachment = input.requires_attachment;
    }
  }

  const completingNow = input.is_completed === true && !item.is_completed;
  if (completingNow) {
    await assertIsNextCompletable(db, job.id, item);
    await assertAttachmentPresentIfRequired(db, job.id, item);
    updates.is_completed = true;
    updates.completed_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return ok({ item });
  }

  const { data: updated, error: updateError } = await db
  .from("job_checklist_items")
  .update(updates)
  .eq("id", item.id)
  .eq("company_id", auth.companyId)
  .select()
  .single();
  if (updateError || !updated) {
    throw new ApiError("internal", "Failed to update checklist item.", updateError?.message);
  }

  if (completingNow) {
    await createTimelineEvent(db, {
      companyId: auth.companyId,
      jobId: job.id,
      eventType: "checklist_completed",
      userId: auth.userId,
      metadata: { label: updated.label, job_seq: job.company_seq },
    });
  }

  return ok({ item: updated });
});

// DELETE /api/checklist-items/[id] — owner/manager only, and ONLY while the
// item is still incomplete. This is a narrow exception to the platform's
// no-DELETE rule: an unactioned item has zero audit/history value (nothing
// has happened yet), so removing a mistaken entry is a pure data correction,
// not a loss of business record. The moment an item is completed it becomes
// historical and this endpoint refuses it — use PATCH to relabel instead.
export const DELETE = withAuth<{ id: string }>(
  async (_request, auth, { params }) => {
    const db = getAdminClient();
    const { item } = await loadForMutation(db, auth, params.id);

    if (item.is_completed) {
      throw new ApiError(
        "conflict",
        "Completed checklist items are historical records and cannot be deleted."
      );
    }

    const { error: deleteError } = await db
  .from("job_checklist_items")
  .delete()
  .eq("id", item.id)
  .eq("company_id", auth.companyId);
    if (deleteError) {
      throw new ApiError("internal", "Failed to delete checklist item.", deleteError.message);
    }

    return ok({ success: true });
  },
  { roles: ["owner", "manager"] }
);
