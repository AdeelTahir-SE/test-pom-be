"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchJobMessages, markJobMessagesRead, sendJobTextMessage } from "@/lib/communications/messageApi";
import { mergeMessages, sortMessagesAsc } from "@/lib/communications/mergeMessages";
import {
  enqueueTextMessage,
  listQueuedTextMessages,
  removeQueuedTextMessage,
} from "@/lib/communications/offlineQueue";
import type { ApiJobMessageV2, LocalJobMessage } from "@/lib/communications/types";
import { getRealtimeClient } from "@/lib/realtime/client";

function optimisticMessage(input: {
  jobId: string;
  userId: string;
  clientMessageId: string;
  content: string;
  createdAt?: string;
  deliveryState?: "sending" | "queued";
}): LocalJobMessage {
  return {
    id: `optimistic-${input.clientMessageId}`,
    job_id: input.jobId,
    sender_id: input.userId,
    recipient_id: null,
    message_type: "text",
    content: input.content,
    attachment_id: null,
    is_urgent: false,
    read_at: null,
    client_message_id: input.clientMessageId,
    transcription_status: "not_applicable",
    transcription_error: null,
    transcribed_at: null,
    created_at: input.createdAt ?? new Date().toISOString(),
    delivery_state: input.deliveryState ?? "sending",
  };
}

export function useJobMessages(input: {
  jobId: string | null;
  userId: string | null | undefined;
  enabled?: boolean;
  onInboundMessage?: (message: ApiJobMessageV2) => void;
}) {
  const { jobId, userId, enabled = true, onInboundMessage } = input;
  const [messages, setMessages] = useState<LocalJobMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"idle" | "connecting" | "connected" | "offline">("idle");
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const messagesRef = useRef<LocalJobMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const drainingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const mergeIncoming = useCallback(
    (incoming: ApiJobMessageV2 | ApiJobMessageV2[]) => {
      const rows = Array.isArray(incoming) ? incoming : [incoming];
      setMessages((prev) => mergeMessages(prev, rows.map((m) => ({ ...m, delivery_state: "sent" }))));
      for (const row of rows) {
        if (row.sender_id !== userId) onInboundMessage?.(row);
      }
    },
    [onInboundMessage, userId]
  );

  const reload = useCallback(async () => {
    if (!jobId || !enabled) {
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const [page, queued] = await Promise.all([
        fetchJobMessages(jobId),
        userId ? listQueuedTextMessages({ jobId, userId }) : Promise.resolve([]),
      ]);
      const serverClientIds = new Set(
        page.messages.map((m) => m.client_message_id).filter(Boolean)
      );
      await Promise.all(
        queued
          .filter((m) => serverClientIds.has(m.clientMessageId))
          .map((m) => removeQueuedTextMessage(m.clientMessageId))
      );
      const queuedMessages = queued
        .filter((m) => !serverClientIds.has(m.clientMessageId))
        .map((m) =>
          optimisticMessage({
            jobId,
            userId: m.userId,
            clientMessageId: m.clientMessageId,
            content: m.content,
            createdAt: m.createdAt,
            deliveryState: "queued",
          })
        );
      setMessages(
        sortMessagesAsc([
          ...page.messages.map((m) => ({ ...m, delivery_state: "sent" as const })),
          ...queuedMessages,
        ])
      );
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [enabled, jobId, userId]);

  const loadOlder = useCallback(async () => {
    if (!jobId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchJobMessages(jobId, { cursor: nextCursor });
      setMessages((prev) =>
        mergeMessages(page.messages.map((m) => ({ ...m, delivery_state: "sent" })), prev)
      );
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [jobId, loadingOlder, nextCursor]);

  const sendText = useCallback(
    async (content: string, options: { clientMessageId?: string } = {}) => {
      if (!jobId || !userId) return;
      const clientMessageId = options.clientMessageId ?? crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const offline = !online;
      const optimistic = optimisticMessage({
        jobId,
        userId,
        clientMessageId,
        content,
        createdAt,
        deliveryState: offline ? "queued" : "sending",
      });
      setMessages((prev) => {
        const exists = prev.some((m) => m.client_message_id === clientMessageId);
        if (exists) {
          return prev.map((m) =>
            m.client_message_id === clientMessageId
              ? { ...m, delivery_state: offline ? "queued" : "sending" }
              : m
          );
        }
        return mergeMessages(prev, [optimistic]);
      });
      if (offline) {
        await enqueueTextMessage({ jobId, userId, clientMessageId, content, createdAt });
        return;
      }
      try {
        const message = await sendJobTextMessage({ jobId, content, clientMessageId });
        await removeQueuedTextMessage(clientMessageId).catch(() => undefined);
        mergeIncoming(message);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.client_message_id === clientMessageId ? { ...m, delivery_state: "failed" } : m
          )
        );
        throw err;
      }
    },
    [jobId, mergeIncoming, online, userId]
  );

  const drainQueuedMessages = useCallback(async () => {
    if (!jobId || !userId || !enabled || drainingRef.current) return;
    if (!online) return;
    drainingRef.current = true;
    try {
      const queued = await listQueuedTextMessages({ jobId, userId });
      for (const item of queued) {
        setMessages((prev) =>
          prev.map((m) =>
            m.client_message_id === item.clientMessageId
              ? { ...m, delivery_state: "sending" }
              : m
          )
        );
        try {
          const message = await sendJobTextMessage({
            jobId: item.jobId,
            content: item.content,
            clientMessageId: item.clientMessageId,
          });
          await removeQueuedTextMessage(item.clientMessageId);
          mergeIncoming(message);
        } catch (err) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setMessages((prev) =>
              prev.map((m) =>
                m.client_message_id === item.clientMessageId
                  ? { ...m, delivery_state: "queued" }
                  : m
              )
            );
            break;
          }
          await removeQueuedTextMessage(item.clientMessageId).catch(() => undefined);
          setMessages((prev) =>
            prev.map((m) =>
              m.client_message_id === item.clientMessageId
                ? { ...m, delivery_state: "failed" }
                : m
            )
          );
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }, [enabled, jobId, mergeIncoming, online, userId]);

  const markRead = useCallback(async () => {
    if (!jobId) return 0;
    return markJobMessagesRead(jobId);
  }, [jobId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void drainQueuedMessages();
  }, [drainQueuedMessages]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setRealtimeStatus("connecting");
    };
    const handleOffline = () => {
      setOnline(false);
      setRealtimeStatus("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!jobId || !enabled) return;
    let cancelled = false;
    setRealtimeStatus("connecting");

    getRealtimeClient()
      .then((client) => {
        if (cancelled) return;
        const channel = client
          .channel(`job:${jobId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "job_messages", filter: `job_id=eq.${jobId}` },
            (payload) => mergeIncoming(payload.new as ApiJobMessageV2)
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "job_messages", filter: `job_id=eq.${jobId}` },
            (payload) => mergeIncoming(payload.new as ApiJobMessageV2)
          )
          .subscribe((status) => {
            setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : "connecting");
            if (status === "SUBSCRIBED") void reload();
          });
        channelRef.current = channel;
      })
      .catch(() => setRealtimeStatus("offline"));

    const reconcile = () => {
      if (document.visibilityState === "visible" && online) {
        void drainQueuedMessages().then(() => reload());
      }
    };
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    return () => {
      cancelled = true;
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void channel.unsubscribe();
    };
  }, [drainQueuedMessages, enabled, jobId, mergeIncoming, online, reload]);

  return {
    messages,
    setMessages,
    loading,
    loadingOlder,
    hasMore,
    realtimeStatus,
    offline: !online,
    reload,
    loadOlder,
    sendText,
    markRead,
    mergeIncoming,
  };
}
