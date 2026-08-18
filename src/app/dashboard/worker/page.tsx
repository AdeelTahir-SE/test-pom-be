"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { api } from "@/lib/api-client";
import { Bell, BellOff, LogOut, Mic, Send, Search as SearchIcon, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { SearchModal } from "@/components/dashboard/SearchModal";
import { Logo } from "@/components/Logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkerDetailModal } from "@/components/dashboard/WorkerDetailModal";
import { OfficeCard } from "@/components/dashboard/OfficeCard";
import { VoiceMessagePlayer } from "@/components/dashboard/VoiceMessagePlayer";
import { BillingRequired } from "@/components/dashboard/BillingRequired";
import { ApiJob, ApiChecklistItem, jobToWorkerCard, jobNumber, formatTime } from "@/lib/dashboardMappers";
import { isOptimisticId } from "@/lib/optimisticId";
import type { ApiNotification } from "@/lib/dashboardMappers";
import type { Message } from "@/lib/types/messages";
import type { OfficeCardThreadItem } from "@/components/dashboard/OfficeCard";
import { LIMITS } from "@/config/constants";
import { addDays, formatSiDateShort, formatSiDateTimeCompact, isJobCardMutable, startOfLocalDay, isJobCommunicationAllowed, jobBelongsToDay, toIsoDate } from "@/lib/officeDate";
import { JOB_COMMUNICATION_TODAY_ONLY_MESSAGE } from "@/lib/services/jobCommunication";
import { toTelHref } from "@/lib/phone";
import { playMessageBeep, unlockMessageBeep } from "@/lib/playMessageBeep";
import { AuraFileInput } from "@/components/dashboard/AuraForm";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useJobMessages } from "@/hooks/useJobMessages";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { isIosInstallRequiredForPush } from "@/lib/pwaInstall";
import {
  apiFailureMessage,
  isPushServiceUnavailableError,
  logClientError,
  userFacingCatchMessage,
} from "@/lib/clientError";

function WorkerDashboardContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedJobId = searchParams.get("job");
  const requestedChatOpen = searchParams.get("chat") === "open";
  const { user, company, officeContact, loading: authLoading, logout } = useCurrentUser();

  // Only workers use this screen. Pisarna (manager) + company (owner) → command center (Mark).
  useEffect(() => {
    if (!authLoading && user && user.role !== "worker") {
      router.replace("/dashboard/office");
    }
  }, [authLoading, user, router]);

  const [job, setJob] = useState<ApiJob | null>(null);
  const [checklist, setChecklist] = useState<ApiChecklistItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay());

  const [chatOpen, setChatOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detailKey, setDetailKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [inboundNotifs, setInboundNotifs] = useState<ApiNotification[]>([]);
  const [showLocalCommunicationCard, setShowLocalCommunicationCard] = useState(false);
  const prevUnreadRef = useRef(0);
  const unreadPrimedRef = useRef(false);
  const seenJobAssignedIdsRef = useRef<Set<string> | null>(null);
  const seenJobIdsRef = useRef<Set<string> | null>(null);
  const openedQueryChatRef = useRef(false);
  const previousJobIdRef = useRef<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleInboundRealtimeMessage = useCallback(() => {
    setShowLocalCommunicationCard(true);
    if (!chatOpen) setUnreadCount((prev) => prev + 1);
    playMessageBeep();
    const activeJobId = job?.id;
    if (!activeJobId) return;
    void api.get<{ notifications: ApiNotification[] }>("/api/notifications").then((res) => {
      if (res.status !== 200 || !res.data) return;
      setInboundNotifs(
        (res.data.notifications ?? []).filter(
          (n) =>
            n.type === "message_received" &&
            !n.hidden_at &&
            n.job_id === activeJobId
        )
      );
    });
  }, [chatOpen, job?.id]);

  const {
    messages,
    setMessages,
    loading: messagesLoading,
    loadingOlder,
    hasMore: hasOlderMessages,
    offline: messagesOffline,
    loadOlder,
    sendText,
    markRead,
    mergeIncoming,
  } = useJobMessages({
    jobId: job?.id ?? null,
    userId: user?.id,
    enabled: !!user && company?.subscription_active !== false,
    onInboundMessage: handleInboundRealtimeMessage,
  });
  const pushNotifications = usePushNotifications(
    !!user && user.role === "worker" && company?.subscription_active !== false
  );

  const loadAll = useCallback(async () => {
    if (company?.subscription_active === false) {
      setDataLoading(false);
      return;
    }
    try {
      const jobsRes = await api.get<{ jobs: ApiJob[] }>("/api/jobs");
      const openJobs = (jobsRes.data?.jobs ?? []).filter(
        (j) => j.status !== "completed" && j.status !== "cancelled"
      );
      const dayKey = toIsoDate(selectedDate);
      const activeJob =
        (requestedJobId ? openJobs.find((j) => j.id === requestedJobId) : null) ??
        openJobs.find((j) => jobBelongsToDay(j, dayKey)) ??
        null;
      if ((activeJob?.id ?? null) !== previousJobIdRef.current) {
        previousJobIdRef.current = activeJob?.id ?? null;
        setShowLocalCommunicationCard(false);
      }
      setJob(activeJob);

      if (activeJob) {
        const [checklistRes, unreadRes, notifsRes] = await Promise.all([
          api.get<{ checklist: ApiChecklistItem[] }>(`/api/jobs/${activeJob.id}/checklist`),
          api.get<{ unread_count: number }>("/api/messages/unread-count"),
          api.get<{ notifications: ApiNotification[] }>("/api/notifications"),
        ]);
        setChecklist(checklistRes.data?.checklist ?? []);
        const nextUnread = unreadRes.data?.unread_count ?? 0;
        setUnreadCount(nextUnread);
        if (!unreadPrimedRef.current) {
          prevUnreadRef.current = nextUnread;
          unreadPrimedRef.current = true;
        }
        setInboundNotifs(
          (notifsRes.data?.notifications ?? []).filter(
            (n) =>
              n.type === "message_received" &&
              !n.hidden_at &&
              n.job_id === activeJob.id
          )
        );
      } else {
        setChecklist([]);
        setUnreadCount(0);
        setInboundNotifs([]);
      }
    } catch (err) {
      logClientError("worker.loadAll", err);
      setToastMessage(
        userFacingCatchMessage(err, t("workerLoadFailed"), t("workerNetworkError"))
      );
      setTimeout(() => setToastMessage(null), 2000);
    } finally {
      setDataLoading(false);
    }
  }, [company?.subscription_active, requestedJobId, t, selectedDate]);

  useEffect(() => {
    if (!authLoading && user && company?.subscription_active !== false) loadAll();
    if (!authLoading && user && company?.subscription_active === false) setDataLoading(false);
  }, [authLoading, user, company?.subscription_active, loadAll]);

  // Unlock Web Audio after first tap (browsers block beeps otherwise).
  useEffect(() => {
    const unlock = () => unlockMessageBeep();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Mark: beep when a new card is assigned or a communication arrives.
  useEffect(() => {
    if (!user || company?.subscription_active === false) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const [notifsRes, jobsRes] = await Promise.all([
        api.get<{ notifications: ApiNotification[] }>("/api/notifications"),
        api.get<{ jobs: ApiJob[] }>("/api/jobs"),
      ]);
      if (cancelled) return;

      let shouldBeep = false;
      let shouldReload = false;

      if (notifsRes.status === 200 && notifsRes.data) {
        const assigned = (notifsRes.data.notifications ?? []).filter(
          (n) => n.type === "job_assigned" && !n.hidden_at,
        );
        const ids = new Set(assigned.map((n) => n.id));
        if (seenJobAssignedIdsRef.current) {
          for (const n of assigned) {
            if (!seenJobAssignedIdsRef.current.has(n.id)) {
              shouldBeep = true;
              shouldReload = true;
              break;
            }
          }
          seenJobAssignedIdsRef.current = ids;
        } else {
          seenJobAssignedIdsRef.current = ids;
        }
      }

      if (jobsRes.status === 200 && jobsRes.data) {
        const openJobs = (jobsRes.data.jobs ?? []).filter(
          (j) => j.status !== "completed" && j.status !== "cancelled" && !j.hidden_at,
        );
        const jobIds = new Set(openJobs.map((j) => j.id));
        if (seenJobIdsRef.current) {
          for (const id of jobIds) {
            if (!seenJobIdsRef.current.has(id)) {
              shouldBeep = true;
              shouldReload = true;
              break;
            }
          }
          seenJobIdsRef.current = jobIds;
        } else {
          seenJobIdsRef.current = jobIds;
        }
      }

      if (shouldBeep) playMessageBeep();
      if (shouldReload) void loadAll();
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [company?.subscription_active, loadAll, user]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  const showToast = (msg: string, durationMs = 2000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), durationMs);
  };

  const handleTogglePushNotifications = async () => {
    try {
      if (pushNotifications.subscribed) {
        await pushNotifications.disable();
        showToast(t("workerPushDisabled"));
      } else {
        await pushNotifications.enable();
        showToast(t("workerPushEnabled"));
      }
    } catch (err) {
      logClientError("worker.pushNotifications", err);
      if (isPushServiceUnavailableError(err)) {
        showToast(t("pushServiceUnavailable"), 8000);
        return;
      }
      showToast(userFacingCatchMessage(err, t("workerPushFailed"), t("workerNetworkError")));
    }
  };

  const officePhone = officeContact?.phone?.trim() || "";
  const officeEmail = officeContact?.email?.trim() || "";
  const telHref = toTelHref(officePhone) ?? undefined;
  const mailHref = officeEmail ? `mailto:${officeEmail}` : undefined;

  const handleCallOffice = () => {
    if (!telHref) {
      showToast(t("workerNoOfficePhone"));
      return;
    }
    window.location.href = telHref;
  };

  const handleEmailOffice = () => {
    if (!mailHref) {
      showToast(t("workerNoOfficeEmail"));
      return;
    }
    window.location.href = mailHref;
  };

  const handleToggleTask = async (id: string) => {
    const item = checklist.find((c) => c.id === id);
    if (!item || item.is_completed) return;
    const ordered = [...checklist].sort((a, b) => a.order_index - b.order_index);
    const next = ordered.find((c) => !c.is_completed);
    if (!next || next.id !== item.id) return;
    // Attachment presence is enforced server-side (file linked to this step).
    try {
      const res = await api.patch<{ item: ApiChecklistItem }>(`/api/checklist-items/${id}`, {
        is_completed: true,
      });
      if (res.status === 200 && res.data) {
        setChecklist((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...res.data!.item, has_attachment: !!c.has_attachment }
              : c,
          ),
        );
        showToast(t("workerTaskUpdated"));
      } else {
        logClientError("worker.toggleTask", res.error, { status: res.status, id });
        showToast(apiFailureMessage(res.error, res.status, t("workerTaskUpdateFailed")));
      }
    } catch (err) {
      logClientError("worker.toggleTask", err, { id });
      showToast(
        userFacingCatchMessage(err, t("workerTaskUpdateFailed"), t("workerNetworkError"))
      );
    }
  };

  const openAttachDialog = (checklistItemId: string) => {
    setAttachTargetId(checklistItemId);
    setAttachFile(null);
    setAttachDialogOpen(true);
  };

  const handleChecklistUpload = async () => {
    const id = attachTargetId;
    const file = attachFile;
    if (!file || !job || !id) return;
    setAttachUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("checklist_item_id", id);
      const res = await api.post<{ files: unknown[] }>(`/api/jobs/${job.id}/files`, formData);
      if (res.status === 200 || res.status === 201) {
        setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, has_attachment: true } : c)));
        setAttachDialogOpen(false);
        setAttachFile(null);
        setAttachTargetId(null);
        showToast(t("workerTaskUpdated"));
      } else {
        logClientError("worker.checklistUpload", res.error, { status: res.status, id });
        showToast(apiFailureMessage(res.error, res.status, t("workerTaskUpdateFailed")));
      }
    } catch (err) {
      logClientError("worker.checklistUpload", err, { id });
      showToast(
        userFacingCatchMessage(err, t("workerTaskUpdateFailed"), t("workerNetworkError"))
      );
    } finally {
      setAttachUploading(false);
    }
  };

  const handleChangeJobStatus = async (status: string) => {
    if (!job) return;
    const res = await api.patch<{ job: ApiJob }>(`/api/jobs/${job.id}`, { status });
    if (res.status === 200) await loadAll();
  };

  const handleOpenChat = async () => {
    setChatOpen(true);
    if (job) {
      await markRead();
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    }
  };

  useEffect(() => {
    if (!requestedChatOpen || openedQueryChatRef.current || !job) return;
    if (requestedJobId && job.id !== requestedJobId) return;
    openedQueryChatRef.current = true;
    void handleOpenChat();
  }, [job, requestedChatOpen, requestedJobId]);

  const handleDismissInboundBox = async () => {
    const snapshot = inboundNotifs;
    setInboundNotifs([]);
    setShowLocalCommunicationCard(false);
    await Promise.all(
      snapshot.map((n) => api.patch(`/api/notifications/${n.id}`, { hidden: true }))
    );
  };

  const handleSendMessage = async () => {
    if (!job) return;
    if (!isJobCommunicationAllowed(job)) {
      showToast(JOB_COMMUNICATION_TODAY_ONLY_MESSAGE);
      return;
    }
    const content = chatInput.trim();
    if (!content) return;
    setChatInput("");
    setShowLocalCommunicationCard(true);
    try {
      await sendText(content);
    } catch (err) {
      logClientError("worker.sendMessage", err, { jobId: job.id });
      showToast(userFacingCatchMessage(err, t("workerMessageSendFailed"), t("workerNetworkError")));
      setChatInput(content);
    }
  };

  const retryFailedMessage = async (messageId: string) => {
    const failed = messages.find((m) => m.id === messageId);
    if (!failed?.content || !failed.client_message_id) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, delivery_state: "sending" } : m))
    );
    try {
      await sendText(failed.content, { clientMessageId: failed.client_message_id });
    } catch (err) {
      logClientError("worker.retryMessage", err, { jobId: job?.id, messageId });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, delivery_state: "failed" } : m))
      );
      showToast(userFacingCatchMessage(err, t("workerMessageSendFailed"), t("workerNetworkError")));
    }
  };

  const handleVoiceComplete = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!job) return;
      const formData = new FormData();
      formData.append("audio", blob, "voice-message.webm");
      try {
        const res = await api.post<{ message: typeof messages[number] }>(
          `/api/jobs/${job.id}/voice-message`,
          formData
        );
        if ((res.status === 200 || res.status === 201) && res.data) {
          mergeIncoming(res.data.message);
          setShowLocalCommunicationCard(true);
          showToast(t("workerVoiceSent"));
        } else {
          logClientError("worker.voiceUpload", res.error, {
            status: res.status,
            jobId: job.id,
            mimeType,
          });
          showToast(
            apiFailureMessage(res.error, res.status, t("workerVoiceSendFailed"))
          );
        }
      } catch (uploadErr) {
        logClientError("worker.voiceUpload", uploadErr, { jobId: job.id, mimeType });
        showToast(
          userFacingCatchMessage(
            uploadErr,
            t("workerVoiceSendFailed"),
            t("workerNetworkError")
          )
        );
      }
    },
    [job, mergeIncoming, messages, t]
  );

  const handleVoiceError = useCallback(
    (error: unknown) => {
      logClientError("worker.voiceRecorder", error);
      const message =
        error instanceof Error && error.message === "empty-audio"
          ? t("workerVoiceSendFailed")
          : userFacingCatchMessage(
              error,
              t("workerMicUnavailable"),
              t("workerNetworkError"),
              t("workerMicUnavailable")
            );
      showToast(message);
    },
    [t]
  );

  const voiceRecorder = useVoiceRecorder({
    maxSeconds: LIMITS.VOICE_MAX_SECONDS,
    onComplete: handleVoiceComplete,
    onError: handleVoiceError,
  });

  const handleStartRecord = async () => {
    if (!job || voiceRecorder.isRecording) return;
    if (!isJobCommunicationAllowed(job)) {
      showToast(JOB_COMMUNICATION_TODAY_ONLY_MESSAGE);
      return;
    }
    await voiceRecorder.start();
  };

  const openJobDetails = () => {
    if (!job) return;
    setIsDetailModalOpen(true);
    setDetailKey((k) => k + 1);
  };

  const handleJobCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openJobDetails();
  };

  const done = checklist.filter((c) => c.is_completed).length;
  const total = checklist.length;
  const selectedWorkerCard = job ? jobToWorkerCard(job, checklist, undefined, t) : null;
  const canCommunicate = job ? isJobCommunicationAllowed(job) : false;

  const completedChecklist = checklist.filter((c) => c.is_completed);
  const pendingChecklist = checklist.filter((c) => !c.is_completed);
  const displayChecklist = [...completedChecklist.slice(-1), ...pendingChecklist.slice(0, 2)];

  const officeSenderLabel = officeContact?.full_name?.trim() || t("cardUnknownSender");
  const messageDisplayText = (message: (typeof messages)[number]) => {
    if (message.message_type !== "voice") return message.content ?? "";
    if (message.transcription_status === "pending") return "Prepis se pripravlja...";
    if (message.transcription_status === "processing") return "Prepisovanje...";
    if (message.transcription_status === "failed") return "Prepis ni na voljo";
    return message.content ?? "Prepis ni na voljo";
  };
  const showInboundBox = Boolean(
    job && messages.length > 0 && (inboundNotifs.length > 0 || showLocalCommunicationCard)
  );
  const inboundThread: OfficeCardThreadItem[] = messages.map((m) => {
    const fromMe = m.sender_id === user?.id;
    return {
      id: m.id,
      senderLabel: fromMe ? user?.full_name || "Jaz" : officeSenderLabel,
      text: messageDisplayText(m),
      time: formatTime(m.created_at),
      type: m.message_type === "voice" ? "glasovno" : "tekst",
      attachmentId: m.attachment_id ?? null,
    };
  });
  const latestInbound = [...messages].reverse().find((m) => m.sender_id !== user?.id) ?? messages[messages.length - 1];
  const inboundCardMessage: Message | null =
    job && latestInbound
      ? {
          id: latestInbound.id,
          workerId: user?.id ?? "",
          workerName: latestInbound.sender_id === user?.id ? user?.full_name || "Jaz" : officeSenderLabel,
          text: messageDisplayText(latestInbound),
          time: formatTime(latestInbound.created_at),
          type: latestInbound.message_type === "voice" ? "glasovno" : "tekst",
          targetTask: job.title,
          attachmentId: latestInbound.attachment_id ?? null,
        }
      : null;

  // Don't paint worker UI for office roles while redirecting to command center.
  if (authLoading || dataLoading || (user && user.role !== "worker")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t("workerLoading")}
      </div>
    );
  }

  if (user && company?.subscription_active === false) {
    return (
      <BillingRequired
        user={user}
        company={company}
        officeContact={officeContact}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 min-[820px]:p-4 font-sans antialiased text-slate-800">
      <div
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          isolation: "isolate",
          background: "#F1F5F9",
          position: "relative",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          gap: "20px"
        }}
        className="select-none w-full h-[100dvh] p-0 border-0 rounded-none shadow-none min-[820px]:h-[828px] min-[820px]:max-w-[450px] min-[820px]:p-2 min-[820px]:border-[8px] min-[820px]:border-white min-[820px]:shadow-[0px_20px_50px_rgba(0,0,0,0.1)] min-[820px]:rounded-[48px]"
      >
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-[80px] left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] font-semibold py-2 px-4 rounded-full shadow-lg z-40 animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}


        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "8px 8px 16px",
            width: "100%",
            gap: "8px"
          }}
          className="shrink-0"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-gradient-to-b from-white to-slate-100 border border-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.55),inset_0_1px_0_white shrink-0">
                <div className="absolute inset-0.5 rounded-[8px] bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(59,130,246,0.28)]" />
                <span className="relative font-['Inter',sans-serif] text-[14px] font-semibold text-white">
                  {user?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-800">
                  {user?.full_name || 'Uporabnik'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-normal text-slate-500">
                  <Logo className="h-5 w-5 rounded-md" showText={false} />
                  pomocnik.net
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pushNotifications.supported ? (
                <button
                  type="button"
                  onClick={handleTogglePushNotifications}
                  disabled={pushNotifications.subscribing}
                  title={
                    pushNotifications.subscribed
                      ? t("workerPushDisableAction")
                      : t("workerPushEnableAction")
                  }
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pushNotifications.subscribed ? (
                    <BellOff className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
                title="Prejšnji dan"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <time
                dateTime={toIsoDate(selectedDate)}
                className="text-center text-xs font-semibold tabular-nums text-slate-600"
              >
                {formatSiDateShort(selectedDate)}
              </time>
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                title="Naslednji dan"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 w-full overflow-y-auto px-3 pb-4 flex flex-col gap-5">
          {pushNotifications.supported &&
          !pushNotifications.subscribed &&
          pushNotifications.permission !== "denied" ? (
            <div className="rounded-2xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{t("workerPushTitle")}</p>
                <p className="text-xs text-slate-500 leading-5">{t("workerPushDesc")}</p>
              </div>
              <button
                type="button"
                onClick={handleTogglePushNotifications}
                disabled={pushNotifications.subscribing}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pushNotifications.subscribing
                  ? t("workerPushSaving")
                  : t("workerPushEnableAction")}
              </button>
            </div>
          ) : null}
          {pushNotifications.supported && pushNotifications.permission === "denied" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              {t("workerPushBlocked")}
            </div>
          ) : null}
          {!pushNotifications.supported && isIosInstallRequiredForPush() ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              {t("iosInstallForPush")}
            </div>
          ) : null}
          {!job ? (
            <p className="text-sm text-slate-400 text-center py-24">{t("workerNoActiveJob")}</p>
          ) : (
            <>
              {/* Main task card */}
              <div
                role="button"
                tabIndex={0}
                onClick={openJobDetails}
                onKeyDown={handleJobCardKeyDown}
                className="shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                style={{
                  border: "1px solid #1D4ED8",
                  boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                  borderRadius: "32px 32px 4px 4px",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  overflow: "hidden",
                  gap: "10px",
                  background: "rgba(255,255,255,0.5)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 20px 12px 20px",
                    gap: "8px"
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'PT Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: "10px",
                      lineHeight: "15px",
                      color: "#94A3B8",
                      whiteSpace: "nowrap"
                    }}
                    className="flex-1 min-w-0 truncate"
                  >
                    {(user?.full_name ?? "").toUpperCase()} • {new Date(job.created_at).toLocaleDateString("sl-SI")} • {jobNumber(job)}
                  </span>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(29, 78, 216, 0.5)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "center",
                      paddingTop: "3px",
                      flexShrink: 0
                    }}
                  >
                    <span style={{ fontFamily: "'PT Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#EB1D1D", lineHeight: "27px" }}>{done}</span>
                    <span style={{ fontFamily: "'PT Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: "#5A5A65", lineHeight: "27px" }}>/{total}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    borderTop: "1px solid rgba(29, 78, 216, 0.15)",
                    borderBottom: "1px solid rgba(29, 78, 216, 0.15)",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 400, fontSize: "16px", color: "#0F172A", lineHeight: "20px" }}>{job.title}</p>
                  <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 400, fontSize: "14px", color: "#465467", lineHeight: "20px", marginTop: "2px" }}>
                    {[job.location, job.customer].filter(Boolean).join(" • ")}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px 20px 20px 20px" }}>
                  {displayChecklist.length === 0 && <p className="text-sm text-slate-400">—</p>}
                  {displayChecklist.map((task) => (
                    <div key={task.id} className="flex flex-col gap-1 w-full group">
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleTask(task.id);
                          }}
                          className="shrink-0 flex items-center justify-center transition-all"
                          style={{
                            width: "16px",
                            height: "16px",
                            background: task.is_completed ? "transparent" : "#E1E4E8",
                            borderRadius: "4px",
                            border: task.is_completed ? "2px solid #41C46D" : "none"
                          }}
                        >
                          {task.is_completed && (
                            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                              <path d="M1 3.5L3.5 6L9 1" stroke="#41C46D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleTask(task.id);
                          }}
                          className="flex-1 text-left truncate transition-all bg-transparent border-none p-0 outline-none"
                          style={{
                            fontFamily: "'PT Sans', sans-serif",
                            fontWeight: 400,
                            fontSize: task.is_completed ? "12px" : "14px",
                            lineHeight: task.is_completed ? "16px" : "18px",
                            letterSpacing: task.is_completed ? "-0.2px" : "0.1px",
                            color: "#64748B"
                          }}
                        >
                          {task.label}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Completed: only if file exists. Upcoming: if required or file exists. */}
                          {((task.is_completed && task.has_attachment) ||
                            (!task.is_completed &&
                              (task.requires_attachment || task.has_attachment))) && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (task.is_completed || task.has_attachment) return;
                                openAttachDialog(task.id);
                              }}
                              disabled={task.is_completed || task.has_attachment}
                              className="flex items-center justify-center bg-transparent border-none p-0 outline-none disabled:cursor-default cursor-pointer"
                            >
                              <svg
                                width={task.is_completed ? 13 : 14}
                                height={task.is_completed ? 15 : 16}
                                viewBox="0 0 14 16"
                                fill="none"
                                className="text-slate-400"
                              >
                                <path
                                  d="M0.5 7.54918L6.15229 1.78552C7.83319 0.0714946 10.5585 0.0714946 12.2394 1.78552C13.9203 3.49954 13.9201 6.27867 12.2392 7.99269L5.71734 14.6431C4.59674 15.7858 2.7802 15.7856 1.6596 14.6429C0.538995 13.5002 0.53872 11.6478 1.65932 10.5051L8.1812 3.85471C8.7415 3.28337 9.65041 3.28337 10.2107 3.85471C10.771 4.42605 10.7706 5.35216 10.2103 5.9235L4.55802 11.6872"
                                  stroke="#151E23"
                                  strokeOpacity={task.is_completed ? 0.15 : 0.3}
                                  strokeWidth={task.is_completed ? undefined : 2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
{task.is_completed && task.completed_at && (
  <span style={{ fontFamily: "'PT Sans', sans-serif", fontWeight: 400, fontSize: "12px", lineHeight: "16px", letterSpacing: "0.1px", color: "#D3D3D3", textAlign: "right" }}>
    {formatSiDateTimeCompact(task.completed_at)}
  </span>
)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions grid */}
              <div className="flex flex-col gap-[30px] mt-[10px] px-1.5 w-full shrink-0">
                <div className="flex justify-between items-center w-full">
                  <button
                    onClick={() => { setIsDetailModalOpen(true); setDetailKey(k => k + 1); }}
                    className="flex items-center gap-3 w-1/2 text-left hover:opacity-80 transition-opacity bg-transparent border-none p-0 outline-none"
                  >
                    <div
                      style={{
                        boxSizing: "border-box",
                        width: "36px",
                        height: "36px",
                        border: "0.7px solid rgba(96, 165, 250, 0.5)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent"
                      }}
                      className="shrink-0"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.2917 8.95833C17.2917 13.5608 13.5608 17.2917 8.95833 17.2917C4.35583 17.2917 0.625 13.5608 0.625 8.95833C0.625 4.35583 4.35583 0.625 8.95833 0.625C13.5608 0.625 17.2917 4.35583 17.2917 8.95833V8.95833" stroke="#3B82F6" strokeWidth="1.25"/>
                        <path d="M0.625 8.95833H3.125M14.7917 8.95833H17.2917M8.95833 17.2917V14.7917M8.95833 3.125V0.625" stroke="#3B82F6" strokeWidth="1.25" strokeLinecap="round"/>
                        <path d="M7.29199 8.95817H10.6253M8.95866 10.6248V7.2915" stroke="#3B82F6" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-sans font-medium text-[11px] text-[#5A5A65] tracking-wide uppercase">PODROBNO</span>
                  </button>

                  <button
                    onClick={() => { setIsDetailModalOpen(true); setDetailKey(k => k + 1); }}
                    className="flex items-center justify-end gap-3 w-1/2 text-right hover:opacity-80 transition-opacity bg-transparent border-none p-0 outline-none"
                  >
                    <span className="font-sans font-medium text-[11px] text-[#5A5A65] tracking-wide uppercase">DODAJ KORAK</span>
                    <div
                      style={{
                        boxSizing: "border-box",
                        width: "36px",
                        height: "36px",
                        border: "0.7px solid rgba(96, 165, 250, 0.5)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent"
                      }}
                      className="shrink-0"
                    >
                      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706" stroke="#6D778E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                </div>

                {showInboundBox && inboundCardMessage && (
                  <OfficeCard
                    message={inboundCardMessage}
                    thread={inboundThread}
                    iconType="mic"
                    onDismiss={() => void handleDismissInboundBox()}
                    onReply={() => void handleOpenChat()}
                  />
                )}

                {!showInboundBox && (
                  <div className="flex justify-between items-center w-full">
                    <button
                      onClick={handleCallOffice}
                      className="flex items-center gap-3 w-1/2 text-left hover:opacity-80 transition-opacity bg-transparent border-none p-0 outline-none"
                    >
                      <div
                        style={{
                          boxSizing: "border-box",
                          width: "36px",
                          height: "36px",
                          border: "0.7px solid rgba(96, 165, 250, 0.5)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent"
                        }}
                        className="shrink-0"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.0818 19.7117C11.3845 22.5175 0.98909 3.99501 7.53545 0.865835L9.45091 0L12.6255 5.68084L10.7318 6.53585C8.74182 7.51418 12.8864 14.9359 14.9218 14.0309C15.0045 13.9967 16.7918 13.1917 16.7982 13.1884L20 18.8509C19.9927 18.8542 18.1918 19.6659 18.0818 19.7117ZM9.50182 17.825C8.16 18.7184 6.31455 18.8 5.75273 17.9134C5.32545 17.2392 5.47 16.4734 5.63727 15.5859C5.82 14.6184 6.02727 13.5209 5.36909 12.4942C4.26091 10.7642 1.82636 10.8417 0 11.9359L0.869091 13.155C1.62273 12.7034 2.49091 12.5092 3.13545 12.6475C4.63818 12.9709 4.18182 14.7525 4.07182 15.3384C3.87909 16.3575 3.66273 17.5134 4.37818 18.645C5.50818 20.4309 8.54091 20.375 10.5927 18.9084C10.2182 18.5692 9.85545 18.2059 9.50182 17.825Z" fill="#6D778E"/>
                        </svg>
                      </div>
                      <span className="font-sans font-medium text-[11px] text-[#5A5A65] tracking-wide uppercase">POKLIČI</span>
                    </button>

                    <button
                      onClick={handleEmailOffice}
                      className="flex items-center justify-end gap-3 w-1/2 text-right hover:opacity-80 transition-opacity bg-transparent border-none p-0 outline-none"
                    >
                      <span className="font-sans font-medium text-[11px] text-[#5A5A65] tracking-wide uppercase">E-POŠTA</span>
                      <div
                        style={{
                          boxSizing: "border-box",
                          width: "36px",
                          height: "36px",
                          border: "0.7px solid rgba(96, 165, 250, 0.5)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent"
                        }}
                        className="shrink-0"
                      >
                        <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10.035 19C3.52417 19 0 15.0232 0 9.88904C0 4.40256 3.96833 0 11.0633 0C16.2417 0 20 3.29335 20 7.83049C20 14.9359 11.3917 16.8118 11.8233 12.7583C11.2317 13.662 10.2783 14.6782 8.44583 14.6782C6.34917 14.6782 5.04583 13.1759 5.04583 10.7576C5.04583 7.13316 7.48 4.07061 10.3617 4.07061C11.7442 4.07061 12.695 4.78507 13.0925 5.88204L13.4792 4.551H15.4275C15.2242 5.22957 13.4933 11.5055 13.4933 11.5055C12.9533 13.6799 14.6183 13.7182 16.095 12.5634C18.8692 10.4591 19.0125 4.95634 15.2633 2.66127C11.2458 0.3034 2.10083 1.76249 2.10083 9.7512C2.10083 14.3275 5.3925 17.4023 10.2917 17.4023C13.155 17.4023 14.91 16.6438 16.3708 15.8135L17.3517 17.1984C15.9258 17.9862 13.6342 19 10.035 19ZM8.08167 7.33298C7.48583 8.42587 7.10083 9.84173 7.10083 10.9411C7.10083 13.8854 10.0358 13.9042 11.4775 11.1361C12.0708 9.99914 12.4533 8.54984 12.4533 7.44226C12.4533 5.06319 9.54083 4.64153 8.08167 7.33298Z" fill="#6D778E"/>
                        </svg>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {!showInboundBox && (
                <div
                  className="shrink-0"
                  style={{
                    background: "rgba(255, 255, 255, 0.3)",
                    border: "1px solid #1D4ED8",
                    boxShadow: "inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                    borderRadius: "4px 4px 32px 32px",
                    padding: "16px 20px",
                    display: "flex",
                    gap: "20px",
                    width: "100%"
                  }}
                >
                  <button
                    onClick={handleStartRecord}
                    disabled={!job || voiceRecorder.isRecording}
                    title={
                      job && !canCommunicate
                        ? JOB_COMMUNICATION_TODAY_ONLY_MESSAGE
                        : undefined
                    }
                    className={`flex-1 flex flex-col items-center gap-2 group bg-transparent border-none p-0 outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      job && !canCommunicate
                        ? "opacity-45 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div
                      style={{
                        boxSizing: "border-box",
                        width: "72px",
                        height: "72px",
                        border: "0.7px solid rgba(96, 165, 250, 0.5)",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                      }}
                      className="group-hover:scale-[1.03] transition-transform"
                    >
                      <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.8542 17.1124C19.2762 18.3754 8.94271 26.6494 6.55021 28.5664L2.50471 24.5209L14.0067 10.2649L20.8542 17.1124ZM28.8177 2.31188C25.7352 -0.770625 20.7357 -0.770625 17.6532 2.31188C15.6207 4.34588 15.4482 6.57487 15.3492 7.36538L23.7642 15.7804C24.4902 15.6994 26.7672 15.5269 28.8177 13.4764C31.9017 10.3939 31.9017 5.39438 28.8177 2.31188ZM14.0667 29.2219C10.6287 29.2219 9.05821 31.3624 6.84271 32.7544C5.27371 33.7384 3.78871 33.2389 3.07471 32.3554C2.81521 32.0389 2.07421 30.8989 3.33571 29.5924L3.14821 29.4049L1.45921 27.7684C-0.598793 29.8924 -0.234293 32.4304 1.04071 34.0039C2.50321 35.8099 5.44471 36.7219 8.23321 34.9714C10.6107 33.4789 11.6637 31.8394 14.0667 29.2219Z" fill="#6D778E"/>
                      </svg>
                    </div>
                    <span className="font-sans font-medium text-[11px] text-[#5A5A65] uppercase tracking-wide">{t("workerVoice")}</span>
                  </button>

                  <button
                    onClick={handleOpenChat}
                    disabled={!job}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer bg-transparent border-none p-0 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div
                      style={{
                        boxSizing: "border-box",
                        width: "72px",
                        height: "72px",
                        border: "0.7px solid rgba(96, 165, 250, 0.5)",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent"
                      }}
                      className="group-hover:scale-[1.03] transition-transform"
                    >
                      <svg width="40" height="36" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.478 25.9492C16.388 32.7082 16.002 33.714 16.002 34.5892C16.002 35.5815 16.772 36 17.256 36C17.8 36 19.472 35.3228 24.914 33.1898L18.478 25.9492ZM20.254 23.9513L26.694 31.1962L39.51 16.794C39.836 16.4272 40 15.948 40 15.4643C40 14.985 39.836 14.5035 39.51 14.1345C38.35 12.8317 36.594 10.8563 35.432 9.5535C35.106 9.18675 34.678 9.00225 34.25 9.00225C33.824 9.00225 33.394 9.18675 33.066 9.5535L20.254 23.9513ZM14 21.9375C14 21.033 13.288 20.25 12.5 20.25C7.378 20.25 6.622 20.25 1.5 20.25C0.712 20.25 0 21.033 0 21.9375C0 22.842 0.712 23.625 1.5 23.625H12.5C13.288 23.625 14 22.842 14 21.9375ZM24 15.1875C24 14.283 23.288 13.5 22.5 13.5C17.378 13.5 6.622 13.5 1.5 13.5C0.712 13.5 0 14.283 0 15.1875C0 16.092 0.712 16.875 1.5 16.875H22.5C23.288 16.875 24 16.092 24 15.1875ZM24 8.4375C24 7.533 23.288 6.75 22.5 6.75C17.378 6.75 6.622 6.75 1.5 6.75C0.712 6.75 0 7.533 0 8.4375C0 9.342 0.712 10.125 1.5 10.125H22.5C23.288 10.125 24 9.342 24 8.4375ZM24 1.6875C24 0.783 23.288 0 22.5 0C17.378 0 6.622 0 1.5 0C0.712 0 0 0.783 0 1.6875C0 2.592 0.712 3.375 1.5 3.375H22.5C23.288 3.375 24 2.592 24 1.6875Z" fill="#6D778E"/>
                      </svg>
                    </div>
                    <span className="font-sans font-medium text-[11px] text-[#5A5A65] uppercase tracking-wide">{t("workerMessages")}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Home indicator */}
        <div
          style={{
            width: "128px",
            height: "4px",
            background: "#0F172A",
            borderRadius: "9999px",
            alignSelf: "center",
            marginTop: "12px",
            marginBottom: "8px"
          }}
          className="shrink-0"
        />

        {/* Worker detail drawer */}
        {selectedWorkerCard && (
          <WorkerDetailModal
            key={detailKey}
            isOpen={isDetailModalOpen}
            onOpenChange={setIsDetailModalOpen}
            worker={selectedWorkerCard}
            jobId={job?.id ?? null}
            cardNumber={job ? jobNumber(job) : null}
            customerName={job?.customer ?? null}
            scheduledAt={job?.scheduled_at ?? null}
            cardMutable={
              job
                ? isJobCardMutable({
                    scheduled_at: job.scheduled_at,
                    created_at: job.created_at,
                  })
                : true
            }
            onRefresh={loadAll}
            onChecklistReorder={(orderedIds) => {
              if (!job?.id || isOptimisticId(job.id)) return;
              setChecklist((prev) => {
                const byId = new Map(prev.map((i) => [i.id, i]));
                return orderedIds
                  .map((id, index) => {
                    const item = byId.get(id);
                    return item ? { ...item, order_index: index } : null;
                  })
                  .filter((i): i is ApiChecklistItem => !!i);
              });
            }}
            jobStatus={job?.status}
            onChangeJobStatus={handleChangeJobStatus}
            inlineDrawer
          />
        )}
      </div>

      {/* Chat dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md w-[90vw] h-[70vh] p-0 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <h4 className="font-bold text-sm text-slate-800">{t("workerChatTitle")}</h4>
            <p className="text-[10px] text-slate-400">{t("workerChatConnected")}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {hasOlderMessages && (
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="mx-auto block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingOlder ? "Nalagam..." : "Naloži starejša sporočila"}
              </button>
            )}
            {messagesOffline && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Brez povezave. Besedilna sporočila bodo poslana, ko bo povezava znova na voljo.
              </p>
            )}
            {messagesLoading && (
              <p className="text-xs text-slate-400 text-center">Nalagam sporočila...</p>
            )}
            {messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              const deliveryLabel =
                m.delivery_state === "sending"
                  ? "Pošiljanje..."
                  : m.delivery_state === "queued"
                    ? "V čakalni vrsti"
                    : m.delivery_state === "failed"
                      ? "Ni poslano"
                      : "";
              return (
                <div key={m.id} className={`flex flex-col max-w-[85%] ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}>
                  <div className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${isMine ? "bg-[#1B3A6B] text-white rounded-tr-none" : "bg-white border border-slate-200/60 rounded-tl-none text-slate-800"}`}>
                    {/* {m.message_type === "voice" && (
                      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/10">
                        <Mic className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                        <span className="text-[8px] font-bold tracking-wider text-emerald-300 uppercase">{t("workerAiTranscriptTag")}</span>
                      </div>
                    )} */}
                    {m.message_type === "voice" && m.attachment_id && (
                      <VoiceMessagePlayer
                        attachmentId={m.attachment_id}
                        className="mb-2"
                        audioClassName="h-9 w-full min-w-[180px]"
                        errorClassName={`mt-1 text-[11px] font-medium ${
                          isMine ? "text-red-100" : "text-red-600"
                        }`}
                      />
                    )}
                    <p className={m.message_type === "voice" ? "italic" : ""}>{messageDisplayText(m)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 px-1 text-[9px] text-slate-400">
                    <span>
                      {new Date(m.created_at).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {deliveryLabel && <span>{deliveryLabel}</span>}
                    {m.delivery_state === "failed" && (
                      <button
                        type="button"
                        onClick={() => retryFailedMessage(m.id)}
                        className="font-semibold text-red-500 hover:underline"
                      >
                        Ponovi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder={
                canCommunicate
                  ? t("workChatPlaceholder")
                  : JOB_COMMUNICATION_TODAY_ONLY_MESSAGE
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              readOnly={!canCommunicate}
              onClick={() => {
                if (!canCommunicate) showToast(JOB_COMMUNICATION_TODAY_ONLY_MESSAGE);
              }}
              className={`flex-1 h-10 text-xs px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 ${
                !canCommunicate ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
            <button
              type="button"
              onClick={handleStartRecord}
              disabled={!canCommunicate || voiceRecorder.isRecording}
              title={
                canCommunicate
                  ? t("workerVoice")
                  : JOB_COMMUNICATION_TODAY_ONLY_MESSAGE
              }
              className={`w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0 ${
                canCommunicate && !voiceRecorder.isRecording
                  ? "hover:bg-slate-50 cursor-pointer"
                  : "opacity-45 cursor-not-allowed"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!canCommunicate}
              title={
                canCommunicate
                  ? undefined
                  : JOB_COMMUNICATION_TODAY_ONLY_MESSAGE
              }
              className={`w-10 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white flex items-center justify-center transition-colors shrink-0 ${
                canCommunicate ? "cursor-pointer" : "opacity-45 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job info dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md w-[90vw]">
          <div className="p-2 space-y-5 text-slate-700">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("workerLabelJob")}</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{job?.title}</h3>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("workerLabelCustomerLocation")}</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {job ? [job.customer, job.location].filter(Boolean).join(" · ") || "—" : "—"}
              </p>
            </div>
            {job?.description && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("workerLabelDescription")}</span>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{job.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recording dialog */}
      <Dialog open={voiceRecorder.isRecording} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-sm w-[90vw] bg-[#0F172A] text-white border-none">
          <div className="flex flex-col items-center text-center py-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                voiceRecorder.isSaving || voiceRecorder.isPaused
                  ? "bg-slate-600"
                  : "bg-red-600 animate-pulse"
              }`}
            >
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-base tracking-wide">
              {voiceRecorder.isSaving ? t("workerVoiceSaving") : t("workerRecording")}
            </h3>
            <span className="text-sm font-semibold text-slate-400 mt-1">
              00:{voiceRecorder.seconds.toString().padStart(2, "0")}
            </span>
            <p className="text-xs text-slate-500 max-w-[220px] mt-3 leading-normal">
              {t("workerRecordingDesc")}
            </p>
            {!voiceRecorder.isSaving && (
              <div className="mt-8 flex w-full justify-center gap-3">
                {voiceRecorder.isPaused ? (
                  <button
                    type="button"
                    onClick={voiceRecorder.resume}
                    className="h-11 rounded-full bg-white px-5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    {t("workerResumeRecord")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={voiceRecorder.pause}
                    disabled={!voiceRecorder.canPause}
                    className="h-11 rounded-full bg-white/10 px-5 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("workerPauseRecord")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={voiceRecorder.finish}
                  className="h-11 rounded-full bg-white px-5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  {t("workerStopRecord")}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Attach file dialog */}
      <Dialog
        open={attachDialogOpen}
        onOpenChange={(open) => {
          setAttachDialogOpen(open);
          if (!open) {
            setAttachFile(null);
            setAttachTargetId(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] border-none shadow-2xl flex flex-col gap-0"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleChecklistUpload();
            }}
            className="relative bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col min-h-[320px]"
          >
            <button
              type="button"
              onClick={() => setAttachDialogOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer border-none"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex flex-col gap-4 flex-grow text-slate-800">
              <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
                {t("modalAttachTitle") || "Dodaj priponko"}
              </h2>
              <p className="text-slate-500 text-[13px] font-medium mb-6">
                Izberite datoteko za ta nalog.
              </p>

              <div className="flex flex-col gap-3">
                <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest mb-1.5">
                  DATOTEKA:
                </label>
                <AuraFileInput
                  id="worker-attach-file"
                  onFile={setAttachFile}
                  onReject={showToast}
                  className="h-11 flex items-center px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-slate-600 hover:bg-slate-100/80 transition-colors font-medium text-[14px]"
                />
                {attachFile && (
                  <div className="mt-1 p-3 rounded-[8px] bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-medium animate-in fade-in-50 duration-200">
                    <Paperclip className="w-3.5 h-3.5 text-[#1B3A6B] shrink-0" />
                    <span className="truncate flex-1">{attachFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex mt-8">
              <button
                type="submit"
                disabled={!attachFile || attachUploading}
                className="w-full h-[48px] rounded-[8px] bg-[#0a1128] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#0a1128]/20 hover:bg-[#152042] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer border-none"
              >
                {attachUploading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  t("modalAdd") || "DODAJ"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}

export default function WorkerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
          Nalaganje…
        </div>
      }
    >
      <WorkerDashboardContent />
    </Suspense>
  );
}
