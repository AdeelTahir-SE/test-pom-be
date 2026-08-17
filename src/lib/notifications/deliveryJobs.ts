import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushNotificationPayload } from "@/lib/notifications/payloads";

export async function createPushDeliveryJob(
  db: SupabaseClient,
  input: {
    companyId: string;
    userId: string;
    messageId: string | null;
    notificationType: string;
    payload: PushNotificationPayload;
  }
): Promise<string | null> {
  try {
    const { data, error } = await db
      .from("notification_delivery_jobs")
      .insert({
        company_id: input.companyId,
        user_id: input.userId,
        message_id: input.messageId,
        notification_type: input.notificationType,
        channel: "push",
        payload: input.payload,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("[push_delivery_job_insert_failed]", input.notificationType, error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error("[push_delivery_job_insert_threw]", input.notificationType, err);
    return null;
  }
}
