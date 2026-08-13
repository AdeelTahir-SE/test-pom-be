import { ApiError } from "@/lib/http/responses";
import { isJobCardMutable } from "@/lib/officeDate";

/** Slovenian copy for frozen-card mutations (Mark a16). */
export const JOB_CARD_FROZEN_MESSAGE =
  "Spremembe kartic za nazaj niso mogoče.";

/**
 * Block all card mutations when the job's board day is 2+ days before today.
 * New messages/voice are gated separately via assertJobCommunicationAllowed (a16 #4).
 */
export function assertJobCardMutable(job: {
  scheduled_at: string | null;
  created_at: string;
}): void {
  if (!isJobCardMutable(job)) {
    throw new ApiError("conflict", JOB_CARD_FROZEN_MESSAGE);
  }
}
