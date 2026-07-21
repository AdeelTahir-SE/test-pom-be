import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { created, ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { loadJobWithAccess } from "@/lib/services/jobAccess";

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

    if (job.status === "completed") {
      throw new ApiError(
        "conflict",
        "This job is completed and its checklist cannot be modified."
      );
    }

    let orderIndex = input.order_index;
    if (orderIndex === undefined) {
      const { data: last } = await db
        .from("job_checklist_items")
        .select("order_index")
        .eq("job_id", params.id)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      orderIndex = (last?.order_index ?? -1) + 1;
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
