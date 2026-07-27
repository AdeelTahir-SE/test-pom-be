"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { api } from "@/lib/api-client";
import { Logo } from "@/components/Logo";
import { LogOut, Mic, Send, Search as SearchIcon } from "lucide-react";
import { SearchModal } from "@/components/dashboard/SearchModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkerDetailModal } from "@/components/dashboard/WorkerDetailModal";
import { ApiJob, ApiChecklistItem, jobToWorkerCard, jobNumber } from "@/lib/dashboardMappers";
import { LIMITS } from "@/config/constants";
import { formatSiDateTimeCompact } from "@/lib/officeDate";

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

  const [messages, setMessages] = useState<ApiJobMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    const jobsRes = await api.get<{ jobs: ApiJob[] }>("/api/jobs");
    const activeJob =
      (jobsRes.data?.jobs ?? []).find((j) => j.status !== "completed" && j.status !== "cancelled") ?? null;
    setJob(activeJob);

    if (activeJob) {
      const [checklistRes, messagesRes, unreadRes] = await Promise.all([
        api.get<{ checklist: ApiChecklistItem[] }>(`/api/jobs/${activeJob.id}/checklist`),
        api.get<{ messages: ApiJobMessage[] }>(`/api/jobs/${activeJob.id}/messages`),
        api.get<{ unread_count: number }>("/api/messages/unread-count"),
      ]);
      setChecklist(checklistRes.data?.checklist ?? []);
      setMessages(messagesRes.data?.messages ?? []);
      setUnreadCount(unreadRes.data?.unread_count ?? 0);
    }
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadAll();
  }, [authLoading, user, loadAll]);

  // Global Polling Rule — unread message count refreshes every 30s.
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.get<{ unread_count: number }>("/api/messages/unread-count");
      if (res.status === 200 && res.data) setUnreadCount(res.data.unread_count);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const officePhone = officeContact?.phone?.trim() || "";
  const officeEmail = officeContact?.email?.trim() || "";
  const telHref = officePhone
    ? `tel:${officePhone.replace(/[^\d+]/g, "")}`
    : undefined;
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
    const res = await api.patch<{ item: ApiChecklistItem }>(`/api/checklist-items/${id}`, { is_completed: true });
    if (res.status === 200 && res.data) {
      setChecklist((prev) => prev.map((c) => (c.id === id ? res.data!.item : c)));
      showToast(t("workerTaskUpdated"));
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
    }
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
    if (!job) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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
        if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
        setIsRecording(false);
      }, LIMITS.VOICE_MAX_SECONDS * 1000);
    } catch {
      showToast(t("workerMicUnavailable"));
    }
  };

  const handleStopRecord = () => {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const done = checklist.filter((c) => c.is_completed).length;
  const total = checklist.length;

  const selectedWorkerCard = job ? jobToWorkerCard(job, checklist, undefined, t) : null;

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t("workerLoading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-slate-800">
      <header className="sticky top-0 z-40 bg-white/84 backdrop-blur-2xl border-b border-white/90 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,1)] h-16 flex items-center justify-between px-6 sm:px-8">
        <div className="flex items-center gap-4">
          <Logo className="h-7 w-auto" />
          <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">{t("workerHeading")}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900">{user?.full_name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_4px_12px_rgba(59,130,246,0.35)]">
            {user ? user.full_name.slice(0, 2).toUpperCase() : ""}
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            title={t("searchTitle")}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-semibold py-2 px-4 rounded-full shadow-lg z-40 animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!job ? (
          <div className="flex items-center justify-center py-24 text-center">
            <p className="text-sm text-slate-400">{t("workerNoActiveJob")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Main column: job card + checklist (FE card chrome, API data) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div
                style={{
                  border: "1px solid #1D4ED8",
                  boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                  borderRadius: "32px 32px 4px 4px",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  overflow: "hidden",
                  gap: "10px",
                  background: "rgba(255,255,255,0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 20px 12px 20px",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'PT Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: "10px",
                      lineHeight: "15px",
                      color: "#94A3B8",
                      whiteSpace: "nowrap",
                    }}
                    className="flex-1 min-w-0 truncate"
                  >
                    {(user?.full_name ?? "").toUpperCase()} • {new Date(job.created_at).toLocaleDateString()} • {jobNumber(job)}
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
                      flexShrink: 0,
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
                    gap: "2px",
                  }}
                >
                  <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 400, fontSize: "16px", color: "#0F172A", lineHeight: "20px" }}>{job.title}</p>
                  <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 400, fontSize: "14px", color: "#465467", lineHeight: "20px", marginTop: "2px" }}>
                    {[job.location, job.customer].filter(Boolean).join(" • ")}
                  </p>
                </div>

                <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
                  {checklist.length === 0 && <p className="text-sm text-slate-400">—</p>}
                  {checklist.map((task) => (
                    <div key={task.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className="shrink-0 flex items-center justify-center transition-all"
                        style={{
                          width: "16px",
                          height: "16px",
                          background: task.is_completed ? "transparent" : "#E1E4E8",
                          borderRadius: "5px",
                          border: task.is_completed ? "2px solid #41C46D" : "none",
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
                        className={`flex-1 text-left bg-transparent border-none p-0 outline-none truncate ${task.is_completed ? "text-slate-400" : "text-slate-700"}`}
                        style={{ fontFamily: "'PT Sans', sans-serif", fontSize: task.is_completed ? "12px" : "14px", lineHeight: "18px" }}
                      >
                        {task.label}
                      </button>
                      {task.is_completed && task.completed_at && (
                        <span className="shrink-0" style={{ fontFamily: "'PT Sans', sans-serif", fontSize: "12px", color: "#94A3B8" }}>
                          {formatSiDateTimeCompact(task.completed_at)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: quick actions + voice/messages */}
            <div className="flex flex-col gap-4">
              <div
                style={{
                  border: "1px solid #1D4ED8",
                  boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                  borderRadius: "32px",
                  background: "rgba(255,255,255,0.6)",
                  padding: "12px",
                }}
                className="grid grid-cols-2 gap-2"
              >
                <button
                  onClick={() => { setIsDetailModalOpen(true); setDetailKey((k) => k + 1); }}
                  className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer"
                >
                  <span style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.2917 8.95833C17.2917 13.5608 13.5608 17.2917 8.95833 17.2917C4.35583 17.2917 0.625 13.5608 0.625 8.95833C0.625 4.35583 4.35583 0.625 8.95833 0.625C13.5608 0.625 17.2917 4.35583 17.2917 8.95833V8.95833" stroke="#3B82F6" strokeWidth="1.25"/>
                      <path d="M0.625 8.95833H3.125M14.7917 8.95833H17.2917M8.95833 17.2917V14.7917M8.95833 3.125V0.625" stroke="#3B82F6" strokeWidth="1.25" strokeLinecap="round"/>
                      <path d="M7.29199 8.95817H10.6253M8.95866 10.6248V7.2915" stroke="#3B82F6" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wide">{t("workerDetail")}</span>
                </button>

                <button onClick={() => setDetailOpen(true)} className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer">
                  <span style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="#6D778E" strokeWidth="1.25"/>
                      <path d="M9 12V9M9 6H9.0075" stroke="#6D778E" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wide">{t("workerInfo")}</span>
                </button>

                <button onClick={handleCallOffice} className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer">
                  <span style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.0818 19.7117C11.3845 22.5175 0.98909 3.99501 7.53545 0.865835L9.45091 0L12.6255 5.68084L10.7318 6.53585C8.74182 7.51418 12.8864 14.9359 14.9218 14.0309C15.0045 13.9967 16.7918 13.1917 16.7982 13.1884L20 18.8509C19.9927 18.8542 18.1918 19.6659 18.0818 19.7117ZM9.50182 17.825C8.16 18.7184 6.31455 18.8 5.75273 17.9134C5.32545 17.2392 5.47 16.4734 5.63727 15.5859C5.82 14.6184 6.02727 13.5209 5.36909 12.4942C4.26091 10.7642 1.82636 10.8417 0 11.9359L0.869091 13.155C1.62273 12.7034 2.49091 12.5092 3.13545 12.6475C4.63818 12.9709 4.18182 14.7525 4.07182 15.3384C3.87909 16.3575 3.66273 17.5134 4.37818 18.645C5.50818 20.4309 8.54091 20.375 10.5927 18.9084C10.2182 18.5692 9.85545 18.2059 9.50182 17.825Z" fill="#6D778E"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wide">{t("workerCall")}</span>
                </button>

                <button onClick={handleEmailOffice} className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer">
                  <span style={{ width: "36px", height: "36px", borderRadius: "12px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.035 19C3.52417 19 0 15.0232 0 9.88904C0 4.40256 3.96833 0 11.0633 0C16.2417 0 20 3.29335 20 7.83049C20 14.9359 11.3917 16.8118 11.8233 12.7583C11.2317 13.662 10.2783 14.6782 8.44583 14.6782C6.34917 14.6782 5.04583 13.1759 5.04583 10.7576C5.04583 7.13316 7.48 4.07061 10.3617 4.07061C11.7442 4.07061 12.695 4.78507 13.0925 5.88204L13.4792 4.551H15.4275C15.2242 5.22957 13.4933 11.5055 13.4933 11.5055C12.9533 13.6799 14.6183 13.7182 16.095 12.5634C18.8692 10.4591 19.0125 4.95634 15.2633 2.66127C11.2458 0.3034 2.10083 1.76249 2.10083 9.7512C2.10083 14.3275 5.3925 17.4023 10.2917 17.4023C13.155 17.4023 14.91 16.6438 16.3708 15.8135L17.3517 17.1984C15.9258 17.9862 13.6342 19 10.035 19ZM8.08167 7.33298C7.48583 8.42587 7.10083 9.84173 7.10083 10.9411C7.10083 13.8854 10.0358 13.9042 11.4775 11.1361C12.0708 9.99914 12.4533 8.54984 12.4533 7.44226C12.4533 5.06319 9.54083 4.64153 8.08167 7.33298Z" fill="#6D778E"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wide">{t("workerEmail")}</span>
                </button>
              </div>

              <div
                style={{
                  border: "1px solid #1D4ED8",
                  boxShadow: "0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)",
                  borderRadius: "4px 4px 32px 32px",
                  background: "rgba(255,255,255,0.6)",
                  padding: "16px",
                }}
                className="grid grid-cols-2 gap-3"
              >
                <button onClick={handleStartRecord} disabled={!job} className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <span style={{ width: "72px", height: "72px", borderRadius: "20px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.9)" }}>
                    <svg width="22" height="25" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.8542 17.1124C19.2762 18.3754 8.94271 26.6494 6.55021 28.5664L2.50471 24.5209L14.0067 10.2649L20.8542 17.1124ZM28.8177 2.31188C25.7352 -0.770625 20.7357 -0.770625 17.6532 2.31188C15.6207 4.34588 15.4482 6.57487 15.3492 7.36538L23.7642 15.7804C24.4902 15.6994 26.7672 15.5269 28.8177 13.4764C31.9017 10.3939 31.9017 5.39438 28.8177 2.31188ZM14.0667 29.2219C10.6287 29.2219 9.05821 31.3624 6.84271 32.7544C5.27371 33.7384 3.78871 33.2389 3.07471 32.3554C2.81521 32.0389 2.07421 30.8989 3.33571 29.5924L3.14821 29.4049L1.45921 27.7684C-0.598793 29.8924 -0.234293 32.4304 1.04071 34.0039C2.50321 35.8099 5.44471 36.7219 8.23321 34.9714C10.6107 33.4789 11.6637 31.8394 14.0667 29.2219Z" fill="#6D778E"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">{t("workerVoice")}</span>
                </button>

                <button onClick={handleOpenChat} disabled={!job} className="relative flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="relative" style={{ width: "72px", height: "72px", borderRadius: "20px", border: "0.7px solid rgba(96, 165, 250, 0.5)", boxShadow: "0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.9)" }}>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    <svg width="26" height="24" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.478 25.9492C16.388 32.7082 16.002 33.714 16.002 34.5892C16.002 35.5815 16.772 36 17.256 36C17.8 36 19.472 35.3228 24.914 33.1898L18.478 25.9492ZM20.254 23.9513L26.694 31.1962L39.51 16.794C39.836 16.4272 40 15.948 40 15.4643C40 14.985 39.836 14.5035 39.51 14.1345C38.35 12.8317 36.594 10.8563 35.432 9.5535C35.106 9.18675 34.678 9.00225 34.25 9.00225C33.824 9.00225 33.394 9.18675 33.066 9.5535L20.254 23.9513ZM14 21.9375C14 21.033 13.288 20.25 12.5 20.25C7.378 20.25 6.622 20.25 1.5 20.25C0.712 20.25 0 21.033 0 21.9375C0 22.842 0.712 23.625 1.5 23.625H12.5C13.288 23.625 14 22.842 14 21.9375ZM24 15.1875C24 14.283 23.288 13.5 22.5 13.5C17.378 13.5 6.622 13.5 1.5 13.5C0.712 13.5 0 14.283 0 15.1875C0 16.092 0.712 16.875 1.5 16.875H22.5C23.288 16.875 24 16.092 24 15.1875ZM24 8.4375C24 7.533 23.288 6.75 22.5 6.75C17.378 6.75 6.622 6.75 1.5 6.75C0.712 6.75 0 7.533 0 8.4375C0 9.342 0.712 10.125 1.5 10.125H22.5C23.288 10.125 24 9.342 24 8.4375ZM24 1.6875C24 0.783 23.288 0 22.5 0C17.378 0 6.622 0 1.5 0C0.712 0 0 0.783 0 1.6875C0 2.592 0.712 3.375 1.5 3.375H22.5C23.288 3.375 24 2.592 24 1.6875Z" fill="#6D778E"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">{t("workerMessages")}</span>
                </button>
              </div>
            </div>
          </div>
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
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[85%] ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${
                      isMine
                        ? "bg-[#1B3A6B] text-white rounded-tr-none"
                        : "bg-white border border-slate-200/60 rounded-tl-none text-slate-800"
                    }`}
                  >
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

            <Button
              onClick={handleStopRecord}
              className="mt-8 rounded-full h-11 px-6 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
            >
              {t("workerStopRecord")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
      />

      <SearchModal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
