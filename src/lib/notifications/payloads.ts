import type { SupabaseClient } from "@supabase/supabase-js";

export interface PushNotificationPayload {
  type: string;
  title: string;
  body: string;
  tag: string;
  data: {
    jobId?: string;
    messageId?: string;
    url: string;
  };
}

export async function buildMessagePushPayload(
  db: SupabaseClient,
  input: {
    companyId: string;
    jobId: string;
    messageId: string;
    senderId: string;
    messageType: "text" | "voice" | "system";
    content: string | null;
    urgent?: boolean;
  }
): Promise<PushNotificationPayload> {
  const [{ data: sender }, { data: job }] = await Promise.all([
    db
      .from("users")
      .select("full_name")
      .eq("id", input.senderId)
      .eq("company_id", input.companyId)
      .maybeSingle(),
    db
      .from("jobs")
      .select("title")
      .eq("id", input.jobId)
      .eq("company_id", input.companyId)
      .maybeSingle(),
  ]);

  const senderName = sender?.full_name?.trim() || "Pomocnik";
  const title =
    input.messageType === "voice"
      ? "Novo glasovno sporočilo"
      : input.urgent
        ? "Nujno sporočilo"
        : "Novo sporočilo";
  const body =
    input.messageType === "voice"
      ? `${senderName}: glasovno sporočilo`
      : `${senderName}: ${(input.content ?? "Novo sporočilo").slice(0, 120)}`;

  return {
    type:
      input.messageType === "voice"
        ? "voice_message_received"
        : input.urgent
          ? "urgent_message"
          : "message_received",
    title,
    body,
    tag: `job-message:${input.jobId}`,
    data: {
      jobId: input.jobId,
      messageId: input.messageId,
      url: `/dashboard/worker?job=${encodeURIComponent(input.jobId)}&chat=open&message=${encodeURIComponent(input.messageId)}`,
    },
  };
}

export function buildJobAssignedPushPayload(input: {
  jobId: string;
  jobTitle: string;
}): PushNotificationPayload {
  return {
    type: "job_assigned",
    title: "Nova naloga",
    body: input.jobTitle,
    tag: `job-assigned:${input.jobId}`,
    data: {
      jobId: input.jobId,
      url: `/dashboard/worker?job=${encodeURIComponent(input.jobId)}`,
    },
  };
}
