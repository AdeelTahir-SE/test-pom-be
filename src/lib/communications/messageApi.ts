"use client";

import { api } from "@/lib/api-client";
import type { ApiJobMessageV2, MessagesPage } from "@/lib/communications/types";

export async function fetchJobMessages(
  jobId: string,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<MessagesPage> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 40));
  if (options.cursor) params.set("cursor", options.cursor);
  const res = await api.get<MessagesPage>(`/api/jobs/${jobId}/messages?${params.toString()}`);
  if (res.status >= 400 || !res.data) {
    throw new Error(res.error?.message ?? "Failed to load messages.");
  }
  return res.data;
}

export async function sendJobTextMessage(input: {
  jobId: string;
  content: string;
  clientMessageId: string;
}): Promise<ApiJobMessageV2> {
  const res = await api.post<{ message: ApiJobMessageV2 }>(`/api/jobs/${input.jobId}/messages`, {
    content: input.content,
    client_message_id: input.clientMessageId,
  });
  if (res.status >= 400 || !res.data?.message) {
    throw new Error(res.error?.message ?? "Failed to send message.");
  }
  return res.data.message;
}

export async function markJobMessagesRead(jobId: string): Promise<number> {
  const res = await api.patch<{ updated_count: number }>(`/api/jobs/${jobId}/messages/read`, {});
  if (res.status >= 400 || !res.data) return 0;
  return res.data.updated_count;
}
