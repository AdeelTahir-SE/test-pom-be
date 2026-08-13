import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import {
  findDuplicateNote,
  findOrCreateCustomer,
  listNotesForCustomerName,
  parseOnceNoteContent,
} from "@/lib/services/customers";
import { createTimelineEvent } from "@/lib/timeline/events";
import { assertJobCardMutable } from "@/lib/services/jobCardFreeze";

export const dynamic = "force-dynamic";

const NOTE_MAX = 280;

// GET /api/customers/notes?name=... — oldest first (Mark: OPOMNIKI). Empty if unknown.
export const GET = withAuth(
  async (request, auth) => {
    const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
    if (!name) {
      throw new ApiError("bad_request", "Query parameter name is required.");
    }
    const db = getAdminClient();
    const { customer, notes } = await listNotesForCustomerName(db, auth.companyId, name);
    return ok({
      customer: customer
        ? { id: customer.id, name: customer.name }
        : null,
      notes,
    });
  },
  { roles: ["owner", "manager", "worker"] }
);

const createNoteSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required.").max(80),
  note: z.string().trim().min(1, "Note is required.").max(NOTE_MAX),
  /** Optional job to attach a customer_note timeline event. */
  job_id: z.string().uuid().optional(),
  /** When true, skip duplicate soft-block and create anyway. */
  force: z.boolean().optional(),
});

// POST /api/customers/notes — create (and ensure customer exists).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createNoteSchema);
    const db = getAdminClient();

    const parsedPreview = parseOnceNoteContent(input.note);
    const freezeJobId = input.job_id ?? parsedPreview.jobId;
    if (freezeJobId) {
      const { data: freezeJob, error: freezeError } = await db
        .from("jobs")
        .select("id, scheduled_at, created_at")
        .eq("id", freezeJobId)
        .eq("company_id", auth.companyId)
        .maybeSingle();
      if (freezeError) {
        throw new ApiError("internal", "Failed to load job for note.", freezeError.message);
      }
      if (freezeJob) {
        assertJobCardMutable({
          scheduled_at: freezeJob.scheduled_at ?? null,
          created_at: freezeJob.created_at,
        });
      }
    }

    const customer = await findOrCreateCustomer(db, auth.companyId, input.customer_name);

    const { data: existingNotes, error: listError } = await db
      .from("customer_notes")
      .select("*")
      .eq("customer_id", customer.id);
    if (listError) {
      throw new ApiError("internal", "Failed to check existing notes.", listError.message);
    }

    const duplicate = findDuplicateNote(existingNotes ?? [], input.note);
    if (duplicate && !input.force) {
      throw new ApiError(
        "conflict",
        "A similar note already exists for this customer. Add it anyway?",
        { existing_note_id: duplicate.id, existing_note: duplicate.note }
      );
    }

    const { data: note, error } = await db
      .from("customer_notes")
      .insert({
        company_id: auth.companyId,
        customer_id: customer.id,
        note: input.note.trim(),
        created_by: auth.userId,
      })
      .select("*")
      .single();
    if (error || !note) {
      throw new ApiError("internal", "Failed to create customer note.", error?.message);
    }

    const parsed = parseOnceNoteContent(note.note);
    const jobId = input.job_id ?? parsed.jobId;
    if (jobId) {
      const [{ data: job }, { data: sender }] = await Promise.all([
        db
          .from("jobs")
          .select("id, company_seq")
          .eq("id", jobId)
          .eq("company_id", auth.companyId)
          .maybeSingle(),
        db.from("users").select("full_name").eq("id", auth.userId).maybeSingle(),
      ]);

      if (job) {
        await createTimelineEvent(db, {
          companyId: auth.companyId,
          jobId: job.id,
          eventType: "job_updated",
          userId: auth.userId,
          metadata: {
            kind: "customer_note",
            content: parsed.displayText,
            sender_name: sender?.full_name ?? null,
            job_seq: job.company_seq,
          },
        });
      }
    }

    return created({
      customer: { id: customer.id, name: customer.name },
      note,
    });
  },
  { roles: ["owner", "manager", "worker"] }
);
