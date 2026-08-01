"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { api } from "@/lib/api-client";
import { LogOut, Mic, Send, Search as SearchIcon } from "lucide-react";
import { SearchModal } from "@/components/dashboard/SearchModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkerDetailModal } from "@/components/dashboard/WorkerDetailModal";
import { OfficeCard } from "@/components/dashboard/OfficeCard";
import { ApiJob, ApiChecklistItem, jobToWorkerCard, jobNumber, formatTime } from "@/lib/dashboardMappers";
import type { ApiNotification } from "@/lib/dashboardMappers";
import type { Message } from "@/lib/mockData";
import type { OfficeCardThreadItem } from "@/components/dashboard/OfficeCard";
import { LIMITS } from "@/config/constants";
import { formatSiDateTimeCompact } from "@/lib/officeDate";
import { toTelHref } from "@/lib/phone";
import { playMessageBeep } from "@/lib/playMessageBeep";

interface ApiJobMessage {
  id: string;
  sender_id: string;
  message_type: "text" | "voice";
  content: string;
  is_urgent: boolean;
  read_at: string | null;
  created_at: string;
}

export default function WorkerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, officeContact, loading: authLoading, logout } = useCurrentUser();

  const [job, setJob] = useState<ApiJob | null>(null);
  const [checklist, setChecklist] = useState<ApiChecklistItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [chatOpen, setChatOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detailKey, setDetailKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [checklistUploadFile, setChecklistUploadFile] = useState<Record<string, File>>({});
  const [checklistUploading, setChecklistUploading] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<ApiJobMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [inboundNotifs, setInboundNotifs] = useState<ApiNotification[]>([]);
  const prevUnreadRef = useRef(0);
  const unreadPrimedRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  /** Prevents double-tap starting two recordings before React state updates. */
  const recordingLockRef = useRef(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const clearRecordingTimers = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  const releaseRecordingLock = () => {
    clearRecordingTimers();
    recordingLockRef.current = false;
    setIsRecording(false);
  };

  const loadAll = useCallback(async () => {
    try {
      const jobsRes = await api.get<{ jobs: ApiJob[] }>("/api/jobs");
      const activeJob =
        (jobsRes.data?.jobs ?? []).find((j) => j.status !== "completed" && j.status !== "cancelled") ?? null;
      setJob(activeJob);

      if (activeJob) {
        const [checklistRes, messagesRes, unreadRes, notifsRes] = await Promise.all([
          api.get<{ checklist: ApiChecklistItem[] }>(`/api/jobs/${activeJob.id}/checklist`),
          api.get<{ messages: ApiJobMessage[] }>(`/api/jobs/${activeJob.id}/messages`),
          api.get<{ unread_count: number }>("/api/messages/unread-count"),
          api.get<{ notifications: ApiNotification[] }>("/api/notifications"),
        ]);
        setChecklist(checklistRes.data?.checklist ?? []);
        setMessages(messagesRes.data?.messages ?? []);
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
        setMessages([]);
        setUnreadCount(0);
        setInboundNotifs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadAll();
  }, [authLoading, user, loadAll]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.get<{ unread_count: number }>("/api/messages/unread-count");
      if (res.status !== 200 || !res.data) return;
      const next = res.data.unread_count;
      if (unreadPrimedRef.current && next > prevUnreadRef.current) {
        playMessageBeep();
        void loadAll();
      } else {
        setUnreadCount(next);
      }
      prevUnreadRef.current = next;
      unreadPrimedRef.current = true;
    }, 15000);
    return () => clearInterval(interval);
  }, [loadAll]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
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
    // Attachment presence is enforced server-side (linked file, or auto-claim orphan).
    try {
      const res = await api.patch<{ item: ApiChecklistItem }>(`/api/checklist-items/${id}`, {
        is_completed: true,
      });
      if (res.status === 200 && res.data) {
        setChecklist((prev) =>
          prev.map((c) => (c.id === id ? { ...res.data!.item, has_attachment: true } : c))
        );
        showToast(t("workerTaskUpdated"));
      } else {
        showToast(res.error?.message ?? t("workerTaskUpdateFailed"));
      }
    } catch (err) {
      console.error(err);
      showToast(t("workerTaskUpdateFailed"));
    }
  };

  const handleChecklistUpload = async (id: string) => {
    const file = checklistUploadFile[id];
    if (!file || !job) return;
    setChecklistUploading((prev) => ({ ...prev, [id]: true }));
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("checklist_item_id", id);
      const res = await api.post<{ files: unknown[] }>(`/api/jobs/${job.id}/files`, formData);
      if (res.status === 200 || res.status === 201) {
        setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, has_attachment: true } : c)));
        setChecklistUploadFile((prev) => ({ ...prev, [id]: null as unknown as File }));
        showToast(t("workerTaskUpdated"));
      } else {
        showToast(t("workerTaskUpdateFailed"));
      }
    } catch (err) {
      console.error(err);
      showToast(t("workerTaskUpdateFailed"));
    } finally {
      setChecklistUploading((prev) => ({ ...prev, [id]: false }));
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
      await api.patch(`/api/jobs/${job.id}/messages/read`, {});
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    }
  };

  const handleDismissInboundBox = async () => {
    const snapshot = inboundNotifs;
    setInboundNotifs([]);
    await Promise.all(
      snapshot.map((n) => api.patch(`/api/notifications/${n.id}`, { hidden: true }))
    );
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !job) return;
    const res = await api.post<{ message: ApiJobMessage }>(`/api/jobs/${job.id}/messages`, { content: chatInput });
    if (res.status === 201 && res.data) {
      setMessages((prev) => [...prev, res.data!.message]);
      setChatInput("");
    }
  };

  const handleStartRecord = async () => {
    if (!job || recordingLockRef.current || isRecording) return;
    recordingLockRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        releaseRecordingLock();
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        const formData = new FormData();
        formData.append("audio", blob, "voice-message.webm");
        const res = await api.post<{ message: ApiJobMessage }>(`/api/jobs/${job.id}/voice-message`, formData);
        if ((res.status === 200 || res.status === 201) && res.data) {
          setMessages((prev) => [...prev, res.data!.message]);
          showToast(t("workerVoiceSent"));
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, LIMITS.VOICE_MAX_SECONDS * 1000);
    } catch {
      releaseRecordingLock();
      showToast(t("workerMicUnavailable"));
    }
  };

  const done = checklist.filter((c) => c.is_completed).length;
  const total = checklist.length;
  const selectedWorkerCard = job ? jobToWorkerCard(job, checklist, undefined, t) : null;

  const completedChecklist = checklist.filter((c) => c.is_completed);
  const pendingChecklist = checklist.filter((c) => !c.is_completed);
  const displayChecklist = [...completedChecklist.slice(-1), ...pendingChecklist.slice(0, 2)];

  const officeSenderLabel = officeContact?.full_name?.trim() || t("cardUnknownSender");
  const showInboundBox = Boolean(job && inboundNotifs.length > 0 && messages.length > 0);
  const inboundThread: OfficeCardThreadItem[] = messages.map((m) => {
    const fromMe = m.sender_id === user?.id;
    return {
      id: m.id,
      senderLabel: fromMe ? user?.full_name || "Jaz" : officeSenderLabel,
      text: m.content,
      time: formatTime(m.created_at),
      type: m.message_type === "voice" ? "glasovno" : "tekst",
    };
  });
  const latestInbound = [...messages].reverse().find((m) => m.sender_id !== user?.id) ?? messages[messages.length - 1];
  const inboundCardMessage: Message | null =
    job && latestInbound
      ? {
          id: latestInbound.id,
          workerId: user?.id ?? "",
          workerName: latestInbound.sender_id === user?.id ? user?.full_name || "Jaz" : officeSenderLabel,
          text: latestInbound.content,
          time: formatTime(latestInbound.created_at),
          type: latestInbound.message_type === "voice" ? "glasovno" : "tekst",
          targetTask: job.title,
        }
      : null;

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t("workerLoading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans antialiased text-slate-800">
      <div
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "8px",
          isolation: "isolate",
          width: "100%",
          maxWidth: "450px",
          height: "828px",
          background: "#F1F5F9",
          border: "8px solid #FFFFFF",
          boxShadow: "0px 20px 50px rgba(0, 0, 0, 0.1)",
          borderRadius: "48px",
          position: "relative",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          gap: "20px"
        }}
        className="select-none"
      >
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-[80px] left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] font-semibold py-2 px-4 rounded-full shadow-lg z-40 animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 8px",
            width: "100%",
            height: "48px"
          }}
          className="shrink-0"
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "14px", lineHeight: "20px", color: "#1E293B" }}>
            {new Date().toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <div className="flex items-center gap-1.5 text-[#1E293B]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 14.6665H14" stroke="#1E293B" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 7.33301C2 6.70434 2 6.39034 2.19533 6.19501C2.39067 5.99967 2.70467 5.99967 3.33333 5.99967C3.962 5.99967 4.276 5.99967 4.47133 6.19501C4.66667 6.39034 4.66667 6.70434 4.66667 7.33301V11.333C4.66667 11.9617 4.66667 12.2757 4.47133 12.471C4.276 12.6663 3.962 12.6663 3.33333 12.6663C2.70467 12.6663 2.39067 12.6663 2.19533 12.471C2 12.2757 2 11.9617 2 11.333V7.33301M6.66667 4.66634C6.66667 4.03767 6.66667 3.72367 6.862 3.52834C7.05733 3.33301 7.37133 3.33301 8 3.33301C8.62867 3.33301 8.94267 3.33301 9.138 3.52834C9.33333 3.72367 9.33333 4.03767 9.33333 4.66634V11.333C9.33333 11.9617 9.33333 12.2757 9.138 12.471C8.94267 12.6663 8 12.6663 7.37133 12.6663C7.05733 12.6663 6.862 12.471C6.66667 12.2757 6.66667 11.9617 6.66667 11.333V4.66634M11.3333 2.66634C11.3333 2.03767 11.3333 1.72367 11.5287 1.52834C11.724 1.33301 12.038 1.33301 12.6667 1.33301C13.2953 1.33301 13.6093 1.33301 13.8047 1.52834C14 1.72367 14 2.03767 14 2.66634V11.333C14 11.9617 14 12.2757 13.8047 12.471C13.6093 12.6663 13.2953 12.6663 12.6667 12.6663C12.038 12.6663 11.724 12.6663 11.5287 12.471C11.3333 12.2757 11.3333 11.9617 11.3333 11.333V2.66634" stroke="#1E293B"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.66602 9.99967C1.66602 6.85717 1.66602 5.28551 2.64268 4.30967C3.61935 3.33384 5.19018 3.33301 8.33268 3.33301H9.58268C12.7252 3.33301 14.2968 3.33301 15.2727 4.30967C16.2485 5.28634 16.2493 6.85717 16.2493 9.99967C16.2493 13.1422 16.2493 14.7138 15.2727 15.6897C14.296 16.6655 12.7252 16.6663 9.58268 16.6663H8.33268C5.19018 16.6663 3.61852 16.6663 2.64268 15.6897C1.66685 14.713 1.66602 13.1422 1.66602 9.99967V9.99967M16.666 8.33301C17.4518 8.33301 17.8443 8.33301 18.0885 8.57717C18.3327 8.8222 18.3327 9.21384 18.3327 9.99967C18.3327 10.7855 18.3327 11.178 18.0885 11.4222C17.8443 11.6663 17.4518 11.6663 16.666 11.6663V8.33301" stroke="#1E293B" strokeWidth="1.25"/>
              <path d="M9.58333 7.5L7.5 10H10.4167L8.33333 12.5" stroke="#1E293B" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 8px 16px",
            width: "100%",
            height: "56px"
          }}
          className="shrink-0"
        >
          <h2 style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 300, fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.5px", color: "#0F172A" }}>
            pomocnik.net
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              title={t("searchTitle")}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white/80 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 w-full overflow-y-auto px-3 pb-4 flex flex-col gap-5">
          {!job ? (
            <p className="text-sm text-slate-400 text-center py-24">{t("workerNoActiveJob")}</p>
          ) : (
            <>
              {/* Main task card */}
              <div
                className="shrink-0"
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
                          onClick={() => handleToggleTask(task.id)}
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
                          onClick={() => handleToggleTask(task.id)}
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
                          {task.has_attachment && (
                            <svg width="13" height="15" viewBox="0 0 14 16" fill="none" className="text-slate-400">
                              <path d="M0.5 7.54918L6.15229 1.78552C7.83319 0.0714946 10.5585 0.0714946 12.2394 1.78552C13.9203 3.49954 13.9201 6.27867 12.2392 7.99269L5.71734 14.6431C4.59674 15.7858 2.7802 15.7856 1.6596 14.6429C0.538995 13.5002 0.53872 11.6478 1.65932 10.5051L8.1812 3.85471C8.7415 3.28337 9.65041 3.28337 10.2107 3.85471C10.771 4.42605 10.7706 5.35216 10.2103 5.9235L4.55802 11.6872" stroke="currentColor" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
{task.is_completed && task.completed_at && (
  <span style={{ fontFamily: "'PT Sans', sans-serif", fontWeight: 400, fontSize: "12px", lineHeight: "16px", letterSpacing: "0.1px", color: "#D3D3D3", textAlign: "right" }}>
    {formatSiDateTimeCompact(task.completed_at)}
  </span>
)}
                        </div>
                      </div>
                      {/* File upload for tasks requiring attachment */}
                      {task.requires_attachment && !task.has_attachment && !task.is_completed && (
                        <div className="flex items-center gap-2 ml-6">
                          <input
                            type="file"
                            id={`file-${task.id}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setChecklistUploadFile((prev) => ({ ...prev, [task.id]: file }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`file-${task.id}`)?.click()}
                            className="text-[11px] text-slate-500 px-2 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            {checklistUploadFile[task.id]?.name || t("fileInputSelect")}
                          </button>
                          {checklistUploadFile[task.id] && (
                            <button
                              type="button"
                              onClick={() => handleChecklistUpload(task.id)}
                              disabled={checklistUploading[task.id]}
                              className="text-[11px] px-2 py-1 rounded-lg bg-[#1B3A6B] text-white hover:bg-[#142c52] disabled:opacity-50 transition-colors"
                            >
                              {checklistUploading[task.id] ? t("modalUploading") : t("modalAdd")}
                            </button>
                          )}
                        </div>
                      )}
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
                    onResolve={() => {}}
                    onDismiss={() => void handleDismissInboundBox()}
                    onReply={() => void handleOpenChat()}
                  />
                )}

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
              </div>

              {/* Bottom voice/message panel */}
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
                  disabled={!job || isRecording}
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
            onRefresh={loadAll}
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
            {messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex flex-col max-w-[85%] ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}>
                  <div className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${isMine ? "bg-[#1B3A6B] text-white rounded-tr-none" : "bg-white border border-slate-200/60 rounded-tl-none text-slate-800"}`}>
                    {m.message_type === "voice" && (
                      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/10">
                        <Mic className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                        <span className="text-[8px] font-bold tracking-wider text-emerald-300 uppercase">{t("workerAiTranscriptTag")}</span>
                      </div>
                    )}
                    <p className={m.message_type === "voice" ? "italic" : ""}>{m.content}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder={t("workChatPlaceholder")}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="flex-1 h-10 text-xs px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
            <button
              onClick={handleSendMessage}
              className="w-10 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
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
      <Dialog open={isRecording} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-sm w-[90vw] bg-[#0F172A] text-white border-none">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-6 animate-pulse shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-base tracking-wide">{t("workerRecording")}</h3>
            <span className="text-sm font-semibold text-slate-400 mt-1">
              00:{recordingSeconds.toString().padStart(2, "0")}
            </span>
            <p className="text-xs text-slate-500 max-w-[220px] mt-3 leading-normal">
              {t("workerRecordingDesc")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
