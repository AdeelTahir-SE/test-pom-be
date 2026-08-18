import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push/server/sendPush";
import {
  isExpiredPushStatus,
  isTransientPushStatus,
  MAX_PUSH_ATTEMPTS,
  nextPushAttemptAt,
} from "@/lib/push/server/retry";
import type { NotificationDeliveryJobRow, PushSubscriptionRow } from "@/types/domain";
import type { PushNotificationPayload } from "@/lib/notifications/payloads";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

async function finishJob(
  db: SupabaseClient,
  job: NotificationDeliveryJobRow,
  update: Record<string, unknown>
) {
  const { error } = await db
    .from("notification_delivery_jobs")
    .update(update)
    .eq("id", job.id);
  if (error) console.error("[push_delivery_job_update_failed]", job.id, error.message);
}

export async function processPendingNotificationDeliveries(
  db: SupabaseClient,
  batchSize = 25
): Promise<{ claimed: number; delivered: number; retry: number; failed: number }> {
  const { data, error } = await db.rpc("claim_notification_delivery_jobs", {
    p_batch_size: batchSize,
  });
  if (error) throw new Error(`Failed to claim push delivery jobs: ${error.message}`);

  const jobs = (data ?? []) as NotificationDeliveryJobRow[];
  let delivered = 0;
  let retry = 0;
  let failed = 0;

  for (const job of jobs) {
    const { data: subscriptions, error: subError } = await db
      .from("push_subscriptions")
      .select("*")
      .eq("company_id", job.company_id)
      .eq("user_id", job.user_id);

    if (subError) {
      const nextAttempt = nextPushAttemptAt(job.attempts);
      await finishJob(db, job, {
        status: nextAttempt ? "retry" : "failed",
        next_attempt_at: nextAttempt,
        last_error: subError.message,
        processing_at: null,
      });
      nextAttempt ? retry++ : failed++;
      continue;
    }

    const devices = (subscriptions ?? []) as PushSubscriptionRow[];
    if (devices.length === 0) {
      await finishJob(db, job, {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        processing_at: null,
        last_error: "No active push subscriptions.",
      });
      failed++;
      continue;
    }

    const errors: string[] = [];
    for (const subscription of devices) {
      try {
        await sendPush({
          subscription,
          payload: job.payload as unknown as PushNotificationPayload,
        });
      } catch (err) {
        const status = errorStatus(err);
        if (isExpiredPushStatus(status)) {
          await db.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          errors.push(`${status ?? "network"}:${errorMessage(err)}`);
        }
      }
    }

    if (errors.length === 0) {
      await finishJob(db, job, {
        status: "delivered",
        delivered_at: new Date().toISOString(),
        processing_at: null,
        last_error: null,
      });
      delivered++;
      continue;
    }

    const statusCode = Number(errors[0]?.split(":")[0]);
    const shouldRetry =
      job.attempts < MAX_PUSH_ATTEMPTS &&
      isTransientPushStatus(Number.isFinite(statusCode) ? statusCode : undefined);
    const nextAttempt = shouldRetry ? nextPushAttemptAt(job.attempts) : null;
    await finishJob(db, job, {
      status: nextAttempt ? "retry" : "failed",
      next_attempt_at: nextAttempt,
      processing_at: null,
      last_error: errors.slice(0, 5).join(" | "),
    });
    nextAttempt ? retry++ : failed++;
  }

  return { claimed: jobs.length, delivered, retry, failed };
}
