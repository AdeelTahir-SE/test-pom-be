import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/config/constants";

export interface NotifyInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  jobId?: string | null;
}

// In-process notification creation (Part 7 §26 Message -> Notification Flow):
// a plain function call, NOT an event bus or queue. Notifications are
// explicitly "optional, simple delivery only" (Foundation Core Principle #1),
// so — same posture as Timeline — a failure here must never roll back the
// business operation that triggered it.
export async function notifyUser(db: SupabaseClient, input: NotifyInput): Promise<void> {
  try {
    const { error } = await db.from("notifications").insert({
      company_id: input.companyId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      job_id: input.jobId ?? null,
    });
    if (error) {
      console.error("[notification_insert_failed]", input.type, error.message);
    }
  } catch (err) {
    console.error("[notification_insert_threw]", input.type, err);
  }
}
