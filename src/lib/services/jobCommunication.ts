import { ApiError } from "@/lib/http/responses";
import { isJobCommunicationAllowed } from "@/lib/officeDate";

/** Slovenian copy — KOMUNIKACIJA / chat send blocked off today (Mark a16 #4). */
export const JOB_COMMUNICATION_TODAY_ONLY_MESSAGE =
  "Komunikacija je mogoča samo za današnji dan.";

/**
 * Block new text/voice messages unless the job's board day is today.
 * Reading history and playing voice remain allowed (Mark a16 #4).
 */
export function assertJobCommunicationAllowed(job: {
  scheduled_at: string | null;
  created_at: string;
}): void {
  if (!isJobCommunicationAllowed(job)) {
    throw new ApiError("conflict", JOB_COMMUNICATION_TODAY_ONLY_MESSAGE);
  }
}
