import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const NOTE_MAX = 280;

const patchSchema = z.object({
  note: z.string().trim().min(1, "Note is required.").max(NOTE_MAX),
});

async function loadOwnedNote(noteId: string, companyId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("customer_notes")
    .select("*")
    .eq("id", noteId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) {
    throw new ApiError("internal", "Failed to load customer note.", error.message);
  }
  if (!data) {
    throw new ApiError("not_found", "Customer note not found.");
  }
  return { db, note: data };
}

// PATCH /api/customer-notes/[id] — edit note text; bumps updated_at.
export const PATCH = withAuth<{ id: string }>(
  async (request, auth, { params }) => {
    const input = await parseJsonBody(request, patchSchema);
    const { db, note } = await loadOwnedNote(params.id, auth.companyId);

    const { data: updated, error } = await db
      .from("customer_notes")
      .update({
        note: input.note.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", note.id)
      .select("*")
      .single();
    if (error || !updated) {
      throw new ApiError("internal", "Failed to update customer note.", error?.message);
    }
    return ok({ note: updated });
  },
  { roles: ["owner", "manager"] }
);

// DELETE /api/customer-notes/[id] — removes note for future visits only.
export const DELETE = withAuth<{ id: string }>(
  async (_request, auth, { params }) => {
    const { db, note } = await loadOwnedNote(params.id, auth.companyId);
    const { error } = await db.from("customer_notes").delete().eq("id", note.id);
    if (error) {
      throw new ApiError("internal", "Failed to delete customer note.", error.message);
    }
    return ok({ deleted: true, id: note.id });
  },
  { roles: ["owner", "manager"] }
);
