import type { SupabaseClient } from "@supabase/supabase-js";

// Closed Timeline event set (Appendix A §4 / Appendix B §15).
// NO additional event types may ever be introduced in the MVP.
export const TIMELINE_EVENT_TYPES = [
  "job_created",
  "job_updated",
  "worker_assigned",
  "status_changed",
  "checklist_completed",
  "image_uploaded",
  "document_uploaded",
  "message_sent",
  "voice_message_transcribed",
  "ocr_completed",
  "file_hidden",
  "notification_deleted",
  "job_completed",
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface CreateTimelineEventInput {
  companyId: string;
  jobId: string;
  eventType: TimelineEventType;
  userId: string | null; // null = system-generated (e.g. ocr_processed)
  metadata?: Record<string, unknown>;
}

// Append-only Timeline write.
// IMPORTANT (spec §9 Failure Rule): Timeline failures MUST NOT roll back the
// business operation. Callers invoke this AFTER the business write has committed,
// and we swallow/log errors instead of throwing.
export async function createTimelineEvent(
  db: SupabaseClient,
  input: CreateTimelineEventInput
): Promise<void> {
  try {
    const { error } = await db.from("timeline_events").insert({
      company_id: input.companyId,
      job_id: input.jobId,
      event_type: input.eventType,
      user_id: input.userId,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.error("[timeline_insert_failed]", input.eventType, error.message);
    }
  } catch (err) {
    console.error("[timeline_insert_threw]", input.eventType, err);
  }
}
