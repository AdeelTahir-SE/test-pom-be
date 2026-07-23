'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/lib/useLanguage';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { api } from '@/lib/api-client';
import {
  ApiJob,
  ApiChecklistItem,
  ApiUser,
  ApiOfficeReminder,
  ApiNotification,
  jobToWorkerCard,
  reminderToCard,
  notificationToMessage,
  jobNumber,
} from '@/lib/dashboardMappers';
import type { Worker, Order, Message } from '@/lib/mockData';
import { LIMITS } from '@/config/constants';
import {
  LogOut,
  Send,
  Mic,
  Users,
  Search as SearchIcon,
  Settings,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  SummaryCard,
  OverviewRow,
  UrgentRow,
} from '@/components/dashboard/SummaryCard';
import { WorkerCard } from '@/components/dashboard/WorkerCard';
import { OfficeCard } from '@/components/dashboard/OfficeCard';
import { CommunicationCard } from '@/components/dashboard/CommunicationCard';
import { WorkerDetailModal } from '@/components/dashboard/WorkerDetailModal';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddReminderModal } from '@/components/dashboard/AddReminderModal';
import { AddWorkerCard } from '@/components/dashboard/AddWorkerCard';
import { TeamManagementModal } from '@/components/dashboard/TeamManagementModal';
import { SearchModal } from '@/components/dashboard/SearchModal';
import { CompanySettingsModal } from '@/components/dashboard/CompanySettingsModal';
import { SortableItem } from '@/components/dashboard/SortableItem';
import { OfficeDayHeader } from '@/components/dashboard/OfficeDayHeader';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  formatSiDate,
  jobBelongsToDay,
  localDayToScheduledAt,
  notificationBelongsToDay,
  parseFlexibleDate,
  startOfLocalDay,
  toIsoDate,
} from '@/lib/officeDate';

interface ApiJobMessage {
  id: string;
  sender_id: string;
  message_type: 'text' | 'voice';
  content: string;
  is_urgent: boolean;
  read_at: string | null;
  created_at: string;
}

interface ColumnHeaderProps {
  title: string;
  onAddClick?: () => void;
  addTitle?: string;
}

function ColumnHeader({ title, onAddClick, addTitle }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between pl-0 pr-6 mb-2">
      <span
        style={{
          fontFamily: "'PT Sans', sans-serif",
          lineHeight: '24px',
        }}
        className="text-slate-900 text-lg font-medium md:text-2xl md:font-normal"
      >
        {title}
      </span>
      <div className="flex items-center gap-2">
        {onAddClick && (
          <button
            onClick={onAddClick}
            title={addTitle}
            aria-label={addTitle}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.002)',
              border: '0.7px solid rgba(96, 165, 250, 0.5)',
              boxShadow:
                '0px 8px 18px -12px rgba(15, 23, 42, 0.35), inset 0px 1px 0px 1px #FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            className="hover:bg-slate-50/50 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 19 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706"
                stroke="#6D778E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface SummaryData {
  field_overview: {
    job_id: string;
    job_title: string;
    location: string | null;
    worker_name: string | null;
    checklist_completed: number;
    checklist_total: number;
  }[];
  urgent_reminder: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
  } | null;
}

export default function OfficeDashboard() {
  const { t } = useLanguage();
  const { user, company, loading: authLoading, logout } = useCurrentUser();

  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [checklistsByJob, setChecklistsByJob] = useState<
    Record<string, ApiChecklistItem[]>
  >({});
  const [workers, setWorkers] = useState<ApiUser[]>([]);
  const [reminders, setReminders] = useState<ApiOfficeReminder[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay());
  const selectedDayKey = toIsoDate(selectedDate);
  const selectedSiDate = formatSiDate(selectedDate);

  const [selectedWorkerJobId, setSelectedWorkerJobId] = useState<string | null>(
    null,
  );
  const [detailKey, setDetailKey] = useState(0);
  const [isWorkerDetailOpen, setIsWorkerDetailOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [companyNameOverride, setCompanyNameOverride] = useState<string | null>(
    null,
  );

  const [replyJobId, setReplyJobId] = useState<string | null>(null);
  const [replyMessages, setReplyMessages] = useState<ApiJobMessage[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [isRecordingReply, setIsRecordingReply] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Template/example cards shown in an otherwise-empty column so first-time
  // users see what a real card looks like, instead of a blank "no items" box.
  // Dismissing one only hides it for today — it reappears tomorrow if the
  // column is still empty, so the key includes today's date.
  const [dismissedDummies, setDismissedDummies] = useState<
    Record<string, boolean>
  >({});
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const dismissDummy = (column: 'teren' | 'pisarna' | 'komunikacija') => {
    const key = `dummy_dismissed_${column}_${todayKey()}`;
    window.localStorage.setItem(key, '1');
    setDismissedDummies((prev) => ({ ...prev, [column]: true }));
  };
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const column of ['teren', 'pisarna', 'komunikacija'] as const) {
      initial[column] =
        window.localStorage.getItem(
          `dummy_dismissed_${column}_${todayKey()}`,
        ) === '1';
    }
    setDismissedDummies(initial);
  }, []);

  // Mobile/tablet: horizontal snap between the three columns
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft } = containerRef.current;
    const children = Array.from(containerRef.current.children) as HTMLElement[];
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;
    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    setActiveTab(closestIndex);
  };

  const goToColumn = (index: number) => {
    if (!containerRef.current) return;
    const clamped = Math.max(0, Math.min(2, index));
    const children = containerRef.current.children;
    const target = children[clamped] as HTMLElement | undefined;
    if (!target) return;
    containerRef.current.scrollTo({
      left: target.offsetLeft,
      behavior: 'smooth',
    });
    setActiveTab(clamped);
  };

  const loadAll = useCallback(async () => {
    const dayKey = toIsoDate(selectedDate);
    const [jobsRes, remindersRes, notificationsRes, usersRes, summaryRes] =
      await Promise.all([
        api.get<{ jobs: ApiJob[] }>('/api/jobs'),
        api.get<{ reminders: ApiOfficeReminder[] }>(
          `/api/office-reminders?date=${dayKey}`,
        ),
        api.get<{ notifications: ApiNotification[] }>('/api/notifications'),
        api.get<{ users: ApiUser[] }>('/api/users'),
        api.get<SummaryData>('/api/dashboard/summary'),
      ]);

    const jobList = jobsRes.data?.jobs ?? [];
    setJobs(jobList);
    setReminders(remindersRes.data?.reminders ?? []);
    setNotifications(notificationsRes.data?.notifications ?? []);
    setWorkers((usersRes.data?.users ?? []).filter((u) => u.role === 'worker'));
    setSummary(summaryRes.data ?? null);

    const activeJobs = jobList.filter(
      (j) =>
        j.worker_id && j.status !== 'completed' && j.status !== 'cancelled',
    );
    const checklistResults = await Promise.all(
      activeJobs.map((j) =>
        api.get<{ checklist: ApiChecklistItem[] }>(
          `/api/jobs/${j.id}/checklist`,
        ),
      ),
    );
    const nextChecklists: Record<string, ApiChecklistItem[]> = {};
    activeJobs.forEach((j, idx) => {
      nextChecklists[j.id] = checklistResults[idx]?.data?.checklist ?? [];
    });
    setChecklistsByJob(nextChecklists);
    setDataLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    if (!authLoading && user) loadAll();
  }, [authLoading, user, loadAll]);

  // Global Polling Rule — notifications, reminders, and the summary cards
  // refresh every 30s so office staff see new activity without a manual reload.
  useEffect(() => {
    if (authLoading || !user) return;
    const dayKey = toIsoDate(selectedDate);
    const interval = setInterval(async () => {
      const [remindersRes, notificationsRes, summaryRes] = await Promise.all([
        api.get<{ reminders: ApiOfficeReminder[] }>(
          `/api/office-reminders?date=${dayKey}`,
        ),
        api.get<{ notifications: ApiNotification[] }>('/api/notifications'),
        api.get<SummaryData>('/api/dashboard/summary'),
      ]);
      if (remindersRes.data) setReminders(remindersRes.data.reminders);
      if (notificationsRes.data)
        setNotifications(notificationsRes.data.notifications);
      if (summaryRes.data) setSummary(summaryRes.data);
    }, 30000);
    return () => clearInterval(interval);
  }, [authLoading, user, selectedDate]);

  const workerById = new Map(workers.map((w) => [w.id, w]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  // Order comes straight from the API (display_order first when a card has
  // been manually dragged, then scheduled_at/created_at) — don't re-sort
  // here or a drag-reorder would visually snap back on the next render.
  // Day filter uses scheduled_at from the task form; undated jobs stay on today.
  const boardTodayKey = toIsoDate(startOfLocalDay());
  const activeJobs = jobs.filter(
    (j) =>
      j.worker_id &&
      j.status !== 'completed' &&
      j.status !== 'cancelled' &&
      jobBelongsToDay(j, selectedDayKey, boardTodayKey),
  );

  const dayReminders = reminders;
  const messageNotifications = notifications.filter(
    (n) =>
      n.type === 'message_received' &&
      !n.hidden_at &&
      notificationBelongsToDay(n, selectedDayKey),
  );

  const dayFieldOverview = (summary?.field_overview ?? []).filter((f) => {
    const job = jobById.get(f.job_id);
    return job ? jobBelongsToDay(job, selectedDayKey, boardTodayKey) : false;
  });
  const dayUrgent = dayReminders.find((r) => r.is_urgent) ?? null;

  const selectedJob = selectedWorkerJobId
    ? jobById.get(selectedWorkerJobId)
    : null;
  const selectedWorkerCard: Worker | null = selectedJob
    ? jobToWorkerCard(
        selectedJob,
        checklistsByJob[selectedJob.id] ?? [],
        workerById.get(selectedJob.worker_id!),
        t,
      )
    : null;

  const handleToggleTask = async (workerId: string, taskId: string) => {
    const item = Object.values(checklistsByJob)
      .flat()
      .find((i) => i.id === taskId);
    if (!item) return;
    const res = await api.patch<ApiChecklistItem>(
      `/api/checklist-items/${taskId}`,
      {
        is_completed: !item.is_completed,
      },
    );
    if (res.status === 200 && res.data) {
      setChecklistsByJob((prev) => ({
        ...prev,
        [item.job_id]: (prev[item.job_id] ?? []).map((i) =>
          i.id === taskId ? res.data! : i,
        ),
      }));
    }
  };

  const handleChangeJobStatus = async (jobId: string, status: string) => {
    const res = await api.patch<{ job: ApiJob }>(`/api/jobs/${jobId}`, {
      status,
    });
    if (res.status === 200) await loadAll();
    else alert(res.error?.message ?? 'Failed to update job status.');
  };

  const handleAddTask = async (taskData: {
    workerId: string;
    opravilo: string;
    kraj: string;
    narocnik: string;
    datum: string;
    steps: { text: string; requiresAttachment: boolean }[];
  }) => {
    const parsed = parseFlexibleDate(taskData.datum) ?? selectedDate;
    const res = await api.post<{ job: ApiJob }>('/api/jobs', {
      title: taskData.opravilo,
      location: taskData.kraj || undefined,
      customer: taskData.narocnik || undefined,
      worker_id: taskData.workerId,
      scheduled_at: localDayToScheduledAt(parsed),
    });
    if (res.status === 201 && res.data) {
      const jobId = res.data.job.id;
      for (const step of taskData.steps) {
        await api.post(`/api/jobs/${jobId}/checklist`, {
          label: step.text,
          requires_attachment: step.requiresAttachment,
        });
      }
      await loadAll();
    }
  };

  const handleAddReminder = async (reminderData: {
    title: string;
    description: string;
    isUrgent: boolean;
    hasAttachment: boolean;
    hasEmail: boolean;
    phoneNumber: string;
    hasConfirm: boolean;
    hasDecline: boolean;
    date?: string;
  }) => {
    const actions: string[] = [];
    if (reminderData.hasAttachment) actions.push('attachment');
    if (reminderData.hasEmail) actions.push('email');
    if (reminderData.phoneNumber) actions.push('phone');
    if (reminderData.hasConfirm) actions.push('confirm');
    if (reminderData.hasDecline) actions.push('reject');

    const remindDay =
      parseFlexibleDate(reminderData.date ?? '') ?? selectedDate;

    const res = await api.post<{ reminder: ApiOfficeReminder }>(
      '/api/office-reminders',
      {
        title: reminderData.title,
        description: reminderData.description || undefined,
        is_urgent: reminderData.isUrgent,
        actions,
        phone: reminderData.phoneNumber || undefined,
        remind_on: toIsoDate(remindDay),
      },
    );
    if (res.status === 201) await loadAll();
  };

  const handleAddWorker = async (workerData: {
    name: string;
    phone: string;
    email: string;
    role: 'worker' | 'manager';
    password: string;
  }) => {
    const res = await api.post<{ user: ApiUser; temporary_password?: string }>(
      '/api/users',
      {
        email: workerData.email,
        full_name: workerData.name,
        role: workerData.role,
        phone: workerData.phone || undefined,
        password: workerData.password || undefined,
      },
    );
    if (res.status === 201) {
      if (res.data?.temporary_password) {
        // Shown exactly once — the backend never returns it again.
        const label =
          workerData.role === 'worker' ? 'Login code' : 'Temporary password';
        alert(
          `Account created for ${workerData.email}.\n${label}: ${res.data.temporary_password}\n\nShare this with them directly — it will not be shown again.`,
        );
      }
      await loadAll();
    } else {
      alert(res.error?.message ?? 'Failed to create account.');
    }
  };

  const handleConfirmReminder = async (id: string) => {
    const res = await api.patch<{ reminder: ApiOfficeReminder }>(
      `/api/office-reminders/${id}`,
      { confirm: true },
    );
    if (res.status === 200 && res.data) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? res.data!.reminder : r)),
      );
    }
  };
  const handleDeclineReminder = async (id: string) => {
    const res = await api.patch<{ reminder: ApiOfficeReminder }>(
      `/api/office-reminders/${id}`,
      { reject: true },
    );
    if (res.status === 200 && res.data) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? res.data!.reminder : r)),
      );
    }
  };
  const handleDismissReminder = async (id: string) => {
    const res = await api.patch(`/api/office-reminders/${id}`, {
      hidden: true,
    });
    if (res.status === 200)
      setReminders((prev) => prev.filter((r) => r.id !== id));
  };
  const handleReminderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayReminders.findIndex((r) => r.id === active.id);
    const newIndex = dayReminders.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(dayReminders, oldIndex, newIndex);
    setReminders(reordered);
    Promise.all(
      reordered.map((r, index) =>
        api
          .patch(`/api/office-reminders/${r.id}`, { order_index: index })
          .catch(() => {}),
      ),
    );
  };
  const handleDismissMessage = async (id: string) => {
    const res = await api.patch(`/api/notifications/${id}`, { hidden: true });
    if (res.status === 200)
      setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const handleJobDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeJobs.findIndex((j) => j.id === active.id);
    const newIndex = activeJobs.findIndex((j) => j.id === over.id);
    const reordered = arrayMove(activeJobs, oldIndex, newIndex);
    const reorderedIds = new Set(reordered.map((j) => j.id));
    setJobs((prev) => [
      ...reordered,
      ...prev.filter((j) => !reorderedIds.has(j.id)),
    ]);
    Promise.all(
      reordered.map((j, index) =>
        api
          .patch(`/api/jobs/${j.id}`, { display_order: index })
          .catch(() => {}),
      ),
    );
  };

  const handleOpenReply = async (jobId: string) => {
    setReplyJobId(jobId);
    setReplyLoading(true);
    const res = await api.get<{ messages: ApiJobMessage[] }>(
      `/api/jobs/${jobId}/messages`,
    );
    setReplyMessages(res.data?.messages ?? []);
    setReplyLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyInput.trim() || !replyJobId) return;
    const res = await api.post<{ message: ApiJobMessage }>(
      `/api/jobs/${replyJobId}/messages`,
      { content: replyInput },
    );
    if (res.status === 201 && res.data) {
      setReplyMessages((prev) => [...prev, res.data!.message]);
      setReplyInput('');
    }
  };

  const handleStartRecordReply = async () => {
    if (!replyJobId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice-message.webm');
        const res = await api.post<{ message: ApiJobMessage }>(
          `/api/jobs/${replyJobId}/voice-message`,
          formData,
        );
        if ((res.status === 200 || res.status === 201) && res.data) {
          setReplyMessages((prev) => [...prev, res.data!.message]);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingReply(true);
      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording')
          mediaRecorderRef.current.stop();
        setIsRecordingReply(false);
      }, LIMITS.VOICE_MAX_SECONDS * 1000);
    } catch {
      alert(t('workerMicUnavailable'));
    }
  };

  const handleStopRecordReply = () => {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecordingReply(false);
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t('officeLoading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-slate-800 dashboard-page">
      <style>{`
        @media (max-width: 1023px) {
          .office-grid {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            scroll-behavior: smooth !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 16px !important;
            width: 100% !important;
            padding-bottom: 16px !important;
            scrollbar-width: none;
          }
          .office-grid::-webkit-scrollbar {
            display: none;
          }
          .office-column-cell {
            flex: 0 0 100% !important;
            width: 100% !important;
            max-width: 100% !important;
            scroll-snap-align: start !important;
            margin-bottom: 0 !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .office-column-cell {
            flex: 0 0 450px !important;
            width: 450px !important;
            max-width: 450px !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/84 backdrop-blur-2xl border-b border-white/90 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,1)] h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Logo className="h-7 w-auto" />
          <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
            {companyNameOverride ?? company?.name}
          </span>
          {user?.role === 'owner' && (
            <button
              onClick={() => setIsCompanySettingsOpen(true)}
              title={t('companySettingsTitle')}
              className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900">
              {user?.full_name}
            </span>
            <span className="text-[10px] text-slate-400 capitalize">
              {user?.role}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_4px_12px_rgba(59,130,246,0.35)]">
            {user ? user.full_name.slice(0, 2).toUpperCase() : ''}
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            title={t('searchTitle')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <Link
            href="/dashboard/office/db"
            title="Podatkovni center (Database)"
            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Database className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setIsTeamOpen(true)}
            title={t('teamTitle')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: '32px' }}>
        <OfficeDayHeader
          title={t('officeHeading')}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          calendarLabel={t('officePickDate')}
          prevDayLabel={t('officePrevDay')}
          nextDayLabel={t('officeNextDay')}
          todayLabel={t('officeJumpToday')}
        />

        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          style={{ marginBottom: '32px' }}
        >
          <SummaryCard title={t('officeQuickOverview')}>
            <div className="flex flex-col gap-[4px]">
              {dayFieldOverview.length === 0 ? (
                <p
                  style={{
                    fontFamily: "'PT Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '18px',
                    color: '#64748B',
                  }}
                >
                  {t('officeQuickOverviewEmpty')}
                </p>
              ) : (
                dayFieldOverview.map((f) => (
                  <OverviewRow
                    key={f.job_id}
                    progress={`${f.checklist_completed}/${f.checklist_total}`}
                    task={f.job_title}
                    location={f.location ?? ''}
                    name={f.worker_name ?? 'Unassigned'}
                  />
                ))
              )}
            </div>
          </SummaryCard>

          <SummaryCard title={t('officeUrgentMatters')} dark>
            <div className="flex flex-col gap-[6px]">
              {!dayUrgent ? (
                <p
                  style={{
                    fontFamily: "'PT Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '18px',
                    color: '#94A3B8',
                  }}
                >
                  {t('officeEmptyUrgent')}
                </p>
              ) : (
                <UrgentRow
                  time={new Date(dayUrgent.created_at).toLocaleTimeString(
                    'sl-SI',
                    { hour: '2-digit', minute: '2-digit' },
                  )}
                  title={dayUrgent.title}
                  subtitle={dayUrgent.description ?? undefined}
                />
              )}
            </div>
          </SummaryCard>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="office-grid grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* COLUMN 1 — DANES TEREN */}
          <div className="flex flex-col gap-3 office-column-cell">
            <ColumnHeader
              title={t('officeColField')}
              onAddClick={() => setIsAddTaskOpen(true)}
              addTitle={t('officeAddTask')}
            />
            <div
              style={{
                background:
                  'linear-gradient(180deg, rgba(96, 165, 250, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)',
                border: '1px solid #1D4ED8',
                boxShadow:
                  '0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)',
                borderRadius: '32px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                overflow: 'hidden',
              }}
              className="group hover:-translate-y-1 transition-all duration-300"
            >
              {activeJobs.length === 0 &&
                (dismissedDummies.teren ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {t('officeEmptyField')}
                  </p>
                ) : (
                  <WorkerCard
                    worker={{
                      id: 'dummy-teren',
                      name: 'IME',
                      avatar: '?',
                      role: 'Naročnik',
                      currentTask: 'Dodajte kartico za terence',
                      location: 'Mesto',
                      status: 'v_teku',
                      tasks: [],
                      phone: '',
                      email: '',
                    }}
                    onToggleTask={() => {}}
                    date="DATUM"
                    orderId="09:26"
                    onDismiss={() => dismissDummy('teren')}
                  />
                ))}
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleJobDragEnd}
              >
                <SortableContext
                  items={activeJobs.map((j) => j.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {activeJobs.map((job) => {
                    const worker = job.worker_id
                      ? workerById.get(job.worker_id)
                      : undefined;
                    const workerCard = jobToWorkerCard(
                      job,
                      checklistsByJob[job.id] ?? [],
                      worker,
                      t,
                    );
                    return (
                      <SortableItem key={job.id} id={job.id}>
                        <WorkerCard
                          worker={workerCard}
                          onToggleTask={handleToggleTask}
                          date={new Date(job.created_at).toLocaleDateString(
                            'sl-SI',
                          )}
                          orderId={jobNumber(job)}
                          onClick={() => {
                            setSelectedWorkerJobId(job.id);
                            setIsWorkerDetailOpen(true);
                            setDetailKey((k) => k + 1);
                          }}
                        />
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* COLUMN 2 — DANES PISARNA */}
          <div className="flex flex-col gap-3 office-column-cell">
            <ColumnHeader
              title={t('officeColOffice')}
              onAddClick={() => setIsAddReminderOpen(true)}
              addTitle={t('officeAddReminder')}
            />
            <div
              style={{
                background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                border: '1px solid #1D4ED8',
                boxShadow:
                  '0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)',
                borderRadius: '32px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                overflow: 'hidden',
              }}
              className="group hover:-translate-y-1 transition-all duration-300"
            >
              {dayReminders.length === 0 &&
                (dismissedDummies.pisarna ? (
                  <p className="text-xs text-white/70 text-center py-4">
                    {t('officeEmptyReminders')}
                  </p>
                ) : (
                  <CommunicationCard
                    order={{
                      id: 'dummy-pisarna',
                      title: 'Dodajte zaznamke za vodjo',
                      description: '',
                      time: '10:30',
                      createdAt: 'ČAS',
                      priority: 'normalna',
                      status: 'caka_potrditev',
                      workerId: '',
                      workerName: 'IME',
                    }}
                    buttonsConfig="none"
                    onResolve={() => {}}
                    onDismiss={() => dismissDummy('pisarna')}
                  />
                ))}
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleReminderDragEnd}
              >
                <SortableContext
                  items={dayReminders.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {dayReminders.map((r) => (
                    <SortableItem key={r.id} id={r.id}>
                      <CommunicationCard
                        order={reminderToCard(r, t)}
                        buttonsConfig="dynamic"
                        showRedButton={r.is_urgent}
                        onResolve={() => handleConfirmReminder(r.id)}
                        onDismiss={() => handleDismissReminder(r.id)}
                        onArchive={() => handleDeclineReminder(r.id)}
                        onCall={() => {
                          if (r.phone) window.location.href = `tel:${r.phone}`;
                        }}
                      />
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* COLUMN 3 — KOMUNIKACIJA */}
          <div className="flex flex-col gap-3 office-column-cell">
            <ColumnHeader
              title={t('officeColComm')}
              onAddClick={() => setIsComposeOpen(true)}
              addTitle={t('officeAddMessage')}
            />
            <div
              style={{
                background:
                  'linear-gradient(180deg, rgba(241, 241, 255, 0.19) 0%, rgba(241, 241, 255, 0.19) 100%)',
                border: '0.6px solid #1D4ED8',
                boxShadow:
                  '0px 24px 60px -30px rgba(59, 130, 246, 0.55), inset 0px 1px 0px 1px rgba(255, 255, 255, 0.35)',
                borderRadius: '32px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                overflow: 'hidden',
              }}
              className="group hover:-translate-y-1 transition-all duration-300"
            >
              {messageNotifications.length === 0 &&
                (dismissedDummies.komunikacija ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {t('officeEmptyComm')}
                  </p>
                ) : (
                  <OfficeCard
                    message={{
                      id: 'dummy-komunikacija',
                      workerId: '',
                      workerName: 'IME',
                      text: 'Kartica tukaj je ustvarjena avtomatsko, ko pride do komunikacije med terenom in pisarno.',
                      time: 'ČAS',
                      type: 'glasovno',
                      targetTask: 'Ni komunikacije',
                    }}
                    iconType="mic"
                    onResolve={() => {}}
                    onDismiss={() => dismissDummy('komunikacija')}
                  />
                ))}
              {messageNotifications.map((n) => (
                <OfficeCard
                  key={n.id}
                  message={notificationToMessage(n, jobById, workerById, t)}
                  iconType="mic"
                  onResolve={() => handleDismissMessage(n.id)}
                  onDismiss={() => handleDismissMessage(n.id)}
                  onReply={
                    n.job_id ? () => handleOpenReply(n.job_id!) : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Column navigation arrows (mobile/tablet only) */}
        <div className="flex items-center justify-center gap-8 mt-5 lg:hidden">
          <button
            onClick={() => goToColumn(activeTab - 1)}
            disabled={activeTab === 0}
            aria-label="Previous column"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid rgb(29, 78, 216)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeTab === 0 ? 'not-allowed' : 'pointer',
              opacity: activeTab === 0 ? 0.35 : 1,
              transition: 'opacity 0.2s',
              flexShrink: 0,
            }}
          >
            <svg
              width="10"
              height="17"
              viewBox="0 0 10 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 15.5L1.5 8.5L9 1.5"
                stroke="rgb(29, 78, 216)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            onClick={() => goToColumn(activeTab + 1)}
            disabled={activeTab === 2}
            aria-label="Next column"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid rgb(29, 78, 216)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeTab === 2 ? 'not-allowed' : 'pointer',
              opacity: activeTab === 2 ? 0.35 : 1,
              transition: 'opacity 0.2s',
              flexShrink: 0,
            }}
          >
            <svg
              width="10"
              height="17"
              viewBox="0 0 10 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1.5L8.5 8.5L1 15.5"
                stroke="rgb(29, 78, 216)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <WorkerDetailModal
        key={detailKey}
        isOpen={isWorkerDetailOpen}
        onOpenChange={setIsWorkerDetailOpen}
        worker={selectedWorkerCard}
        jobId={selectedWorkerJobId}
        cardNumber={selectedJob ? jobNumber(selectedJob) : null}
        onRefresh={loadAll}
        jobStatus={selectedJob?.status}
        onChangeJobStatus={
          selectedWorkerJobId
            ? (status) => handleChangeJobStatus(selectedWorkerJobId, status)
            : undefined
        }
        canCancelJob
      />
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        workers={workers.map((w) => ({ id: w.id, name: w.full_name }))}
        defaultDate={selectedSiDate}
        onAddTask={handleAddTask}
      />
      <AddReminderModal
        isOpen={isAddReminderOpen}
        onOpenChange={setIsAddReminderOpen}
        defaultDate={selectedSiDate}
        onAddReminder={handleAddReminder}
      />
      <AddWorkerCard
        isOpen={isAddWorkerOpen}
        onOpenChange={setIsAddWorkerOpen}
        onAddWorker={handleAddWorker}
      />

      <TeamManagementModal
        isOpen={isTeamOpen}
        onOpenChange={setIsTeamOpen}
        currentUserId={user?.id}
        onChanged={loadAll}
        isOwner={user?.role === 'owner'}
        onAddMember={() => {
          setIsTeamOpen(false);
          setIsAddWorkerOpen(true);
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onOpenJob={(jobId) => {
          setIsSearchOpen(false);
          setSelectedWorkerJobId(jobId);
          setIsWorkerDetailOpen(true);
          setDetailKey((k) => k + 1);
        }}
      />

      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onOpenChange={setIsCompanySettingsOpen}
        companyName={companyNameOverride ?? company?.name ?? ''}
        canManageBilling={user?.role === 'owner'}
        subscriptionActive={company?.subscription_active ?? true}
        hasStripeCustomer={!!company?.stripe_customer_id}
        onSaved={setCompanyNameOverride}
      />

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-sm w-[90vw] p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h4 className="font-bold text-sm text-slate-800">
              {t('officeComposeTitle')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              {t('officeComposePickJob')}
            </p>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3 space-y-2">
            {activeJobs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {t('officeComposeEmpty')}
              </p>
            ) : (
              activeJobs.map((job) => {
                const worker = job.worker_id
                  ? workerById.get(job.worker_id)
                  : undefined;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setIsComposeOpen(false);
                      void handleOpenReply(job.id);
                    }}
                    className="w-full text-left px-3 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {worker?.full_name ?? t('cardUnassigned')}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 shrink-0">
                        {jobNumber(job)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {job.title}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!replyJobId}
        onOpenChange={(open) => !open && setReplyJobId(null)}
      >
        <DialogContent className="max-w-md w-[90vw] h-[70vh] p-0 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <h4 className="font-bold text-sm text-slate-800">
              {t('officeChatTitle')}
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {replyLoading && (
              <p className="text-xs text-slate-400 text-center">
                {t('officeLoading')}
              </p>
            )}
            {!replyLoading &&
              replyMessages.map((m) => {
                const isMine = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${
                        isMine
                          ? 'bg-[#1B3A6B] text-white rounded-tr-none'
                          : 'bg-white border border-slate-200/60 rounded-tl-none text-slate-800'
                      }`}
                    >
                      <p className={m.message_type === 'voice' ? 'italic' : ''}>
                        {m.content}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {new Date(m.created_at).toLocaleTimeString('sl-SI', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder={t('workChatPlaceholder')}
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendReply();
              }}
              className="flex-1 h-10 text-xs px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
            <button
              onClick={handleStartRecordReply}
              title={t('workerVoice')}
              className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendReply}
              className="w-10 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordingReply} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm w-[90vw] bg-[#0F172A] text-white border-none"
        >
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-6 animate-pulse shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-base tracking-wide">
              {t('workerRecording')}
            </h3>
            <Button
              onClick={handleStopRecordReply}
              className="mt-8 rounded-full h-11 px-6 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer"
            >
              {t('workerStopRecord')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
