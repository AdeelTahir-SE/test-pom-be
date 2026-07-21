import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";
import { createTimelineEvent } from "@/lib/timeline/events";

export const dynamic = "force-dynamic";

const updateNotificationSchema = z
  .object({
    is_read: z.literal(true).optional(),
    hidden: z.literal(true).optional(),
  })
  .refine((obj) => obj.is_read !== undefined || obj.hidden !== undefined, {
    message: "At least one of is_read or hidden must be provided.",
  });

// PATCH /api/notifications/[id] — mark read and/or hide. Everyone may
// dismiss their own notifications (Permission Matrix §12: "Delete
// Notification Card" is granted to Owner/Manager/Worker alike). Hiding never
// deletes the record (Appendix A: "notification_deleted represents a user
// hide action only"); Timeline is strictly Job-scoped (Timeline System Spec
// §2), so the hide is only logged when the notification is tied to a Job.
export const PATCH = withAuth<{ id: string }>(async (request, auth, { params }) => {
  const input = await parseJsonBody(request, updateNotificationSchema);
  const db = getAdminClient();

  const { data: notification, error } = await db
    .from("notifications")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", auth.companyId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error) throw new ApiError("internal", "Failed to load notification.", error.message);
  if (!notification) throw new ApiError("not_found", "Notification not found.");

  const updates: Record<string, unknown> = {};
  if (input.is_read) updates.is_read = true;
  if (input.hidden) updates.hidden_at = new Date().toISOString();

  const { data: updated, error: updateError } = await db
    .from("notifications")
    .update(updates)
    .eq("id", notification.id)
    .select()
    .single();
  if (updateError || !updated) {
    throw new ApiError("internal", "Failed to update notification.", updateError?.message);
  }

  if (input.hidden && notification.job_id) {
    await createTimelineEvent(db, {
      companyId: auth.companyId,
      jobId: notification.job_id,
      eventType: "notification_deleted",
      userId: auth.userId,
      metadata: { title: notification.title },
    });
  }

  return ok({ notification: updated });
});
