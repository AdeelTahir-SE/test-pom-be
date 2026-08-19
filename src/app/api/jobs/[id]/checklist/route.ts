import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { loadJobWithAccess } from "@/lib/services/jobAccess";
import { assertJobCardMutable } from "@/lib/services/jobCardFreeze";

export const dynamic = "force-dynamic";

// GET /api/jobs/[id]/checklist — default order order_index ASC (Appendix A §7).
export const GET = withAuth<{ id: string }>(async (_request, auth, { params }) => {
  const db = getAdminClient();
  await loadJobWithAccess(db, auth, params.id);

  const { data, error } = await db
    .from("job_checklist_items")
    .select("*")
    .eq("job_id", params.id)
    .order("order_index", { ascending: true });
  if (error) throw new ApiError("internal", "Failed to load checklist.", error.message);

  // Only files linked to a checklist item count (Mark: no orphan / guessing).
  const { data: files, error: filesError } = await db
    .from("job_files")
    .select("checklist_item_id")
    .eq("job_id", params.id)
    .is("hidden_at", null)
    .not("checklist_item_id", "is", null);
  if (filesError) throw new ApiError("internal", "Failed to load checklist attachments.", filesError.message);

  const itemsWithAttachment = new Set((files ?? []).map((f) => f.checklist_item_id));
  const checklist = (data ?? []).map((item) => ({
    ...item,
    has_attachment: itemsWithAttachment.has(item.id),
  }));

  return ok({ checklist });
});

const createChecklistItemSchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  order_index: z.number().int().min(0).optional(),
  requires_attachment: z.boolean().optional(),
});

// POST /api/jobs/[id]/checklist — owner/manager add today's checklist items
// (Jobs Engine §13; Dashboard Card Creation "office may add checklist items").
// Checklist is static data — no workflow engine, no item dependencies (§13).
export const POST = withAuth<{ id: string }>(
  async (request, auth, { params }) => {
    const input = await parseJsonBody(request, createChecklistItemSchema);
    const db = getAdminClient();
    const { job } = await loadJobWithAccess(db, auth, params.id);
    assertJobCardMutable({
      scheduled_at: (job.scheduled_at as string | null) ?? null,
      created_at: String(job.created_at),
    });

    if (job.status === "completed") {
      throw new ApiError(
        "conflict",
        "This job is completed and its checklist cannot be modified."
      );
    }

    const { data: existing, error: existingError } = await db
      .from("job_checklist_items")
      .select("id, order_index, is_completed")
      .eq("job_id", params.id)
      .order("order_index", { ascending: true });
    if (existingError) {
      throw new ApiError("internal", "Failed to load checklist.", existingError.message);
    }

    const items = existing ?? [];
    const completedCount = items.filter((i) => i.is_completed).length;
    // New incomplete steps may only land at/after the completed block.
    const minIndex = completedCount;
    const maxIndex = items.length;
    let orderIndex =
      input.order_index === undefined ? maxIndex : input.order_index;
    orderIndex = Math.min(Math.max(orderIndex, minIndex), maxIndex);

    // Shift siblings so order_index stays dense and unique.
    const toShift = items.filter((i) => i.order_index >= orderIndex);
    for (const sibling of [...toShift].sort((a, b) => b.order_index - a.order_index)) {
      const { error: shiftError } = await db
        .from("job_checklist_items")
        .update({ order_index: sibling.order_index + 1 })
        .eq("id", sibling.id)
        .eq("company_id", auth.companyId);
      if (shiftError) {
        throw new ApiError("internal", "Failed to make room for checklist item.", shiftError.message);
      }
    }

    const { data: item, error } = await db
      .from("job_checklist_items")
      .insert({
        company_id: auth.companyId,
        job_id: params.id,
        label: input.label,
        order_index: orderIndex,
        requires_attachment: input.requires_attachment ?? false,
      })
      .select()
      .single();
    if (error || !item) {
      throw new ApiError("internal", "Failed to add checklist item.", error?.message);
    }

    return created({ item });
  },
  { roles: ["owner", "manager"] }
);
