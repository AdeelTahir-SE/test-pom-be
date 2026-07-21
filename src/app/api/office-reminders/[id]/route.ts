import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const updateReminderSchema = z
  .object({
    order_index: z.number().int().min(0).optional(),
    hidden: z.literal(true).optional(),
    confirm: z.literal(true).optional(),
    reject: z.literal(true).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one of order_index, hidden, confirm, or reject must be provided.",
  });

// PATCH /api/office-reminders/[id] — owner/manager only: reorder, hide
// (dismiss — Card Creation spec: "not deleted permanently, remains stored"),
// or confirm/reject (mutually exclusive manager decision state).
export const PATCH = withAuth<{ id: string }>(
  async (request, auth, { params }) => {
    const input = await parseJsonBody(request, updateReminderSchema);
    const db = getAdminClient();

    const { data: reminder, error } = await db
      .from("office_reminders")
      .select("*")
      .eq("id", params.id)
      .eq("company_id", auth.companyId)
      .maybeSingle();
    if (error) throw new ApiError("internal", "Failed to load office reminder.", error.message);
    if (!reminder) throw new ApiError("not_found", "Office reminder not found.");

    const updates: Record<string, unknown> = {};
    if (input.order_index !== undefined) updates.order_index = input.order_index;
    if (input.hidden) updates.hidden_at = new Date().toISOString();
    if (input.confirm) {
      updates.action_state = { ...reminder.action_state, confirmed: true, rejected: false };
    }
    if (input.reject) {
      updates.action_state = { ...reminder.action_state, confirmed: false, rejected: true };
    }

    const { data: updated, error: updateError } = await db
      .from("office_reminders")
      .update(updates)
      .eq("id", reminder.id)
      .select()
      .single();
    if (updateError || !updated) {
      throw new ApiError("internal", "Failed to update office reminder.", updateError?.message);
    }

    return ok({ reminder: updated });
  },
  { roles: ["owner", "manager"] }
);
