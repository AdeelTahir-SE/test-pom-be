import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import {
  findDuplicateNote,
  findOrCreateCustomer,
  listNotesForCustomerName,
} from "@/lib/services/customers";

export const dynamic = "force-dynamic";

const NOTE_MAX = 280;

// GET /api/customers/notes?name=... — newest first. Empty list if customer unknown.
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
  /** When true, skip duplicate soft-block and create anyway. */
  force: z.boolean().optional(),
});

// POST /api/customers/notes — create (and ensure customer exists).
export const POST = withAuth(
  async (request, auth) => {
    const input = await parseJsonBody(request, createNoteSchema);
    const db = getAdminClient();
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

    return created({
      customer: { id: customer.id, name: customer.name },
      note,
    });
  },
  { roles: ["owner", "manager", "worker"] }
);
