import type { TranscriptionStatus } from "@/config/constants";

export interface ApiJobMessageV2 {
  id: string;
  company_id?: string;
  job_id?: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: "text" | "voice" | "system";
  content: string | null;
  attachment_id: string | null;
  is_urgent: boolean;
  read_at: string | null;
  client_message_id: string | null;
  transcription_status: TranscriptionStatus | null;
  transcription_error: string | null;
  transcribed_at: string | null;
  created_at: string;
}

export type LocalDeliveryState = "sending" | "sent" | "failed" | "queued";

export interface LocalJobMessage extends ApiJobMessageV2 {
  delivery_state?: LocalDeliveryState;
}

export interface MessagesPage {
  messages: ApiJobMessageV2[];
  nextCursor: string | null;
  hasMore: boolean;
}
