import type { LocalJobMessage } from "@/lib/communications/types";

export function sortMessagesAsc<T extends { created_at: string; id: string }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

export function mergeMessages(
  current: LocalJobMessage[],
  incoming: LocalJobMessage[]
): LocalJobMessage[] {
  const byId = new Map<string, LocalJobMessage>();
  const clientIdToServerId = new Map<string, string>();

  for (const message of current) {
    byId.set(message.id, message);
    if (message.client_message_id) clientIdToServerId.set(message.client_message_id, message.id);
  }

  for (const message of incoming) {
    const optimisticId =
      message.client_message_id ? clientIdToServerId.get(message.client_message_id) : undefined;
    if (optimisticId && optimisticId !== message.id) byId.delete(optimisticId);
    byId.set(message.id, { ...message, delivery_state: message.delivery_state ?? "sent" });
    if (message.client_message_id) clientIdToServerId.set(message.client_message_id, message.id);
  }

  return sortMessagesAsc([...byId.values()]);
}
