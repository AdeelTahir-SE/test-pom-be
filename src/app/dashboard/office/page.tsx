'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/landing/Footer';
import { useLanguage } from '@/lib/useLanguage';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { api } from '@/lib/api-client';
import {
  ApiJob,
  ApiChecklistItem,
  ApiUser,
  ApiOfficeReminder,
  jobToWorkerCard,
  reminderToCard,
  communicationToMessage,
  jobNumber,
  formatTime,
} from '@/lib/dashboardMappers';
import type { Worker, Order } from '@/lib/mockData';
import type { Message } from '@/lib/types/messages';
import { LIMITS } from '@/config/constants';
import {
  JOB_ATTACHMENT_ACCEPT,
  jobAttachmentErrorMessage,
  validateJobAttachmentFile,
} from "@/lib/uploadValidation";
import {
  apiFailureMessage,
  logClientError,
  userFacingCatchMessage,
} from "@/lib/clientError";
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useJobMessages } from '@/hooks/useJobMessages';
import { getRealtimeClient } from '@/lib/realtime/client';
import { queryKeys } from '@/lib/query/keys';
import {
  LogOut,
  Send,
  Mic,
  Users,
  Search as SearchIcon,
  Settings,
  Paperclip,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  SummaryCard,
  OverviewRow,
  UrgentRow,
} from '@/components/dashboard/SummaryCard';
import { DailySummaryPanel } from '@/components/dashboard/DailySummaryPanel';
import { WorkerCard } from '@/components/dashboard/WorkerCard';
import { OfficeCard } from '@/components/dashboard/OfficeCard';
import { VoiceMessagePlayer } from '@/components/dashboard/VoiceMessagePlayer';
import { BillingLockBanner } from '@/components/dashboard/BillingRequired';
import { CommunicationCard } from '@/components/dashboard/CommunicationCard';
import { WorkerDetailModal } from '@/components/dashboard/WorkerDetailModal';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddReminderModal } from '@/components/dashboard/AddReminderModal';
import { AttachmentDialog } from '@/components/dashboard/AttachmentDialog';
import {
  AttachmentLightbox,
  type AttachmentLightboxItem,
} from '@/components/dashboard/AttachmentLightbox';
import { AddWorkerCard } from '@/components/dashboard/AddWorkerCard';
import { SearchModal } from '@/components/dashboard/SearchModal';
import { SortableItem } from '@/components/dashboard/SortableItem';
import { OfficeDayHeader } from '@/components/dashboard/OfficeDayHeader';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  formatSiDate,
  formatSiDateFromDayKey,
  isoToLocalDayKey,
  isCommunicationDayAllowed,
  isJobCardMutable,
  jobBelongsToDay,
  localDayToScheduledAt,
  normalizeRemindTime,
  parseFlexibleDate,
  remindTimeSortMinutes,
  reminderBelongsToDay,
  startOfLocalDay,
  toIsoDate,
} from '@/lib/officeDate';
import { JOB_COMMUNICATION_TODAY_ONLY_MESSAGE } from '@/lib/services/jobCommunication';
import { playMessageBeep, unlockMessageBeep } from '@/lib/playMessageBeep';
import { toTelHref } from '@/lib/phone';
import { useOfficeBoard } from '@/hooks/useOfficeBoard';
import { isOptimisticId, newOptimisticId } from '@/lib/optimisticId';

interface ColumnHeaderProps {
  title: string;
  onAddClick?: () => void;
  addTitle?: string;
  /** Visible but not actionable — click still fires onAddClick (toast) (Mark a16 #4). */
  addLocked?: boolean;
}

function ColumnHeader({ title, onAddClick, addTitle, addLocked = false }: ColumnHeaderProps) {
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
              cursor: addLocked ? 'pointer' : 'pointer',
              opacity: addLocked ? 0.55 : 1,
              position: 'relative',
              zIndex: 2,
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

export default function OfficeDashboard() {
  const { t } = useLanguage();
  const { user, company, officeContact, loading: authLoading, logout } = useCurrentUser();
  const router = useRouter();
  const billingLocked = company?.subscription_active === false;
  const billingLockedMessage = 'Aktivirajte naročnino za uporabo.';

  useEffect(() => {
    if (!authLoading && user && user.role === 'worker') {
      router.replace('/dashboard/worker');
    }
  }, [authLoading, user, router]);

  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay());
  const selectedDayKey = toIsoDate(selectedDate);
  const selectedSiDate = formatSiDate(selectedDate);

  const {
    jobs,
    reminders,
    communications,
    workers,
    checklistsByJob,
    dataLoading,
    setJobs,
    setReminders,
    setCommunications,
    setChecklistsByJob,
    setWorkers,
    refreshBoard,
    queryClient,
  } = useOfficeBoard(
    selectedDayKey,
    !authLoading && !!user
  );

  // Unlock Web Audio after first tap so inbound beeps can play (Mark).
  useEffect(() => {
    const unlock = () => unlockMessageBeep();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Beep when a new inbound communication arrives (not messages we sent).
  const seenCommIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    seenCommIdsRef.current = null;
  }, [selectedDayKey]);

  useEffect(() => {
    if (!user || user.role === 'worker' || !company?.id) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void getRealtimeClient()
      .then((client) => {
        if (cancelled) return;
        channel = client
          .channel(`office-communications:${company.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'job_messages',
              filter: `company_id=eq.${company.id}`,
            },
            () => {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.office.communications(selectedDayKey),
              });
            },
          )
          .subscribe();
      })
      .catch((err) => {
        logClientError('office.communicationsRealtime', err);
      });

    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [company?.id, queryClient, selectedDayKey, user]);

  useEffect(() => {
    if (!user?.id) return;
    const ids = new Set(communications.map((m) => m.id));
    if (seenCommIdsRef.current === null) {
      seenCommIdsRef.current = ids;
      return;
    }
    const hasInbound = communications.some(
      (m) => !seenCommIdsRef.current!.has(m.id) && m.sender_id !== user.id,
    );
    for (const id of ids) seenCommIdsRef.current.add(id);
    if (hasInbound) playMessageBeep();
  }, [communications, user?.id]);

  // Optimistic checklist rows for jobs not yet confirmed by the API (temp ids).
  const [checklistOverrides, setChecklistOverrides] = useState<
    Record<string, ApiChecklistItem[]>
  >({});
  const mergedChecklistsByJob = { ...checklistsByJob, ...checklistOverrides };

  const [selectedWorkerJobId, setSelectedWorkerJobId] = useState<string | null>(
    null,
  );
  const [detailKey, setDetailKey] = useState(0);
  const [isWorkerDetailOpen, setIsWorkerDetailOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [reminderEditTarget, setReminderEditTarget] = useState<string | null>(null);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [attachmentDialogReminderId, setAttachmentDialogReminderId] = useState<string | null>(null);
  const [jobCardAttachTarget, setJobCardAttachTarget] = useState<{
    jobId: string;
    taskId: string;
  } | null>(null);
  const [reminderPreview, setReminderPreview] =
    useState<AttachmentLightboxItem | null>(null);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<ApiUser[]>([]);

  // Full company roster (all roles + login_pin) for the add-worker left list.
  useEffect(() => {
    if (!isAddWorkerOpen) return;
    let cancelled = false;
    void (async () => {
      const res = await api.get<{ users: ApiUser[] }>('/api/users');
      if (!cancelled && res.status === 200 && res.data?.users) {
        setCompanyUsers(res.data.users);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAddWorkerOpen]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [companyNameOverride, setCompanyNameOverride] = useState<string | null>(
    null,
  );

  const [replyJobId, setReplyJobId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeWorkerId, setComposeWorkerId] = useState('');
  const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(
    null,
  );
  const [pendingConfirmTask, setPendingConfirmTask] = useState<{
    workerId: string;
    taskId: string;
    jobId: string;
    label: string;
    requiresAttachment: boolean;
    hasAttachment: boolean;
    attachmentName?: string | null;
    attachmentUrl?: string | null;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);
  const showBillingLockedToast = useCallback(() => {
    showToast(billingLockedMessage);
  }, [showToast]);
  const requireBillingUnlocked = useCallback(() => {
    if (!billingLocked) return true;
    showBillingLockedToast();
    return false;
  }, [billingLocked, showBillingLockedToast]);

  const {
    messages: replyMessages,
    setMessages: setReplyMessages,
    loading: replyLoading,
    loadingOlder: replyLoadingOlder,
    hasMore: replyHasMore,
    offline: replyMessagesOffline,
    loadOlder: loadOlderReplyMessages,
    sendText: sendReplyText,
    mergeIncoming: mergeReplyIncoming,
  } = useJobMessages({
    jobId: replyJobId,
    userId: user?.id,
    enabled: !!user && !!replyJobId,
  });

  const cardAttachInputRef = useRef<HTMLInputElement | null>(null);
  const cardAttachTargetRef = useRef<{ jobId: string; taskId: string } | null>(
    null,
  );
  // Template/example cards shown in an otherwise-empty column so first-time
  // users see what a real card looks like, instead of a blank "no items" box.
  // Dummy cards only show on the company creation date.
  const [dismissedDummies, setDismissedDummies] = useState<
    Record<string, boolean>
  >({});
  const companyCreationDate = company?.created_at 
    ? new Date(company.created_at).toISOString().slice(0, 10) 
    : null;
  const isCompanyCreationDateSelected = companyCreationDate && selectedDayKey === companyCreationDate;
  const shouldShowDummy = (column: 'teren' | 'pisarna' | 'komunikacija') => {
    if (!isCompanyCreationDateSelected) return false;
    return !dismissedDummies[column];
  };
  const dismissDummy = (column: 'teren' | 'pisarna' | 'komunikacija') => {
    const key = `dummy_dismissed_${column}_${companyCreationDate}`;
    window.localStorage.setItem(key, '1');
    setDismissedDummies((prev) => ({ ...prev, [column]: true }));
  };
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const column of ['teren', 'pisarna', 'komunikacija'] as const) {
      initial[column] =
        window.localStorage.getItem(
          `dummy_dismissed_${column}_${companyCreationDate}`,
        ) === '1';
    }
    setDismissedDummies(initial);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openParam = params.get('open');
      if (openParam === 'team') {
        // Mark: Ekipa popup not shown — open Dodaj sodelavca instead.
        if (billingLocked) {
          showBillingLockedToast();
        } else {
          setIsAddWorkerOpen(true);
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [billingLocked, companyCreationDate, showBillingLockedToast]);

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

  const workerById = new Map(workers.map((w) => [w.id, w]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  // Order comes straight from the API (display_order first when a card has
  // been manually dragged, then scheduled_at/created_at) — don't re-sort
  // here or a drag-reorder would visually snap back on the next render.
  // Day filter uses scheduled_at from the task form; undated jobs stay on today.
  const boardTodayKey = toIsoDate(startOfLocalDay());
  const communicationAllowed = isCommunicationDayAllowed(
    selectedDayKey,
    boardTodayKey,
  );
  const showCommunicationBlockedToast = () =>
    showToast(JOB_COMMUNICATION_TODAY_ONLY_MESSAGE);
  const activeJobs = jobs.filter(
    (j) =>
      j.worker_id &&
      j.status !== 'completed' &&
      j.status !== 'cancelled' &&
      !j.hidden_at &&
      jobBelongsToDay(j, selectedDayKey, boardTodayKey),
  );

  // Compose (col 3): only workers with an open TEREN card on the selected day (Mark).
  const composeWorkerOptions = (() => {
    const seen = new Set<string>();
    const options: { id: string; name: string }[] = [];
    for (const j of activeJobs) {
      if (isOptimisticId(j.id)) continue;
      if (!j.worker_id || seen.has(j.worker_id)) continue;
      seen.add(j.worker_id);
      options.push({
        id: j.worker_id,
        name: workerById.get(j.worker_id)?.full_name || 'Delavec',
      });
    }
    return options.sort((a, b) => a.name.localeCompare(b.name, 'sl'));
  })();

  // Same day-matching as column 1 / API — never show a reminder on the wrong day.
  // Order by big remind time (earliest first); no-time cards last (Mark).
  const dayReminders = reminders
    .filter((r) =>
      reminderBelongsToDay(r, selectedDayKey, boardTodayKey),
    )
    .slice()
    .sort((a, b) => {
      const byTime =
        remindTimeSortMinutes(a.remind_time) - remindTimeSortMinutes(b.remind_time);
      if (byTime !== 0) return byTime;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  // Shared office channel (a6) — one conversation box per job for all office roles.
  const dayCommunications = communications;
  const communicationThreads = (() => {
    const byJob = new Map<string, typeof dayCommunications>();
    for (const m of dayCommunications) {
      const list = byJob.get(m.job_id) ?? [];
      list.push(m);
      byJob.set(m.job_id, list);
    }
    return [...byJob.entries()]
      .map(([jobId, msgs]) => {
        const ordered = [...msgs].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        const latest = ordered[ordered.length - 1]!;
        return { jobId, messages: ordered, latest };
      })
      .sort(
        (a, b) =>
          new Date(b.latest.created_at).getTime() -
          new Date(a.latest.created_at).getTime(),
      );
  })();

  // Derive HITRI PREGLED from the same TEREN cards on screen (Mark: must sync
  // without a full page refresh). Do not wait on /api/dashboard/summary cache.
  const dayFieldOverview = activeJobs.map((job) => {
    const checklist = mergedChecklistsByJob[job.id] ?? [];
    const completed = checklist.filter((i) => i.is_completed).length;
    const worker = job.worker_id ? workerById.get(job.worker_id) : null;
    return {
      job_id: job.id,
      job_title: job.title,
      location: job.location,
      worker_name: worker?.full_name ?? null,
      checklist_completed: completed,
      checklist_total: checklist.length,
    };
  });
  const dayUrgent = dayReminders.find((r) => r.is_urgent) ?? null;

  const selectedJob = selectedWorkerJobId
    ? jobById.get(selectedWorkerJobId)
    : null;
  const selectedWorkerCard: Worker | null = selectedJob
    ? jobToWorkerCard(
        selectedJob,
        mergedChecklistsByJob[selectedJob.id] ?? [],
        workerById.get(selectedJob.worker_id!),
        t,
      )
    : null;

  const handleToggleTask = async (_workerId: string, taskId: string) => {
    if (!requireBillingUnlocked()) return;
    const item = Object.values(mergedChecklistsByJob)
      .flat()
      .find((i) => i.id === taskId);
    if (!item || isOptimisticId(item.id) || isOptimisticId(item.job_id)) return;
    // Completed steps stay permanently done (Mark a2).
    if (item.is_completed) return;

    const siblings = [...(mergedChecklistsByJob[item.job_id] ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const next = siblings.find((i) => !i.is_completed);
    if (!next || next.id !== item.id) return;

    // Open confirm UI immediately — don't block on /files (was 4–10s).
    const hasAttachment = !!item.has_attachment;
    setPendingConfirmTask({
      workerId: _workerId,
      taskId: item.id,
      jobId: item.job_id,
      label: item.label,
      requiresAttachment: !!item.requires_attachment,
      hasAttachment,
      attachmentName: null,
      attachmentUrl: null,
    });

    if (!(item.requires_attachment || item.has_attachment)) return;

    // Enrich with linked filename/url in the background (optional).
    void (async () => {
      const filesRes = await api.get<{
        files: Array<{
          file_name: string;
          signed_url: string | null;
          checklist_item_id?: string | null;
        }>;
      }>(`/api/jobs/${item.job_id}/files`);
      if (filesRes.status !== 200 || !filesRes.data?.files?.length) return;
      const linked = filesRes.data.files.find(
        (f) => f.checklist_item_id === item.id,
      );
      if (!linked) return;
      setPendingConfirmTask((prev) =>
        prev && prev.taskId === item.id
          ? {
              ...prev,
              hasAttachment: true,
              attachmentName: linked.file_name,
              attachmentUrl: linked.signed_url,
            }
          : prev,
      );
    })();
  };

  const completeConfirmedTask = async () => {
    if (!requireBillingUnlocked()) {
      setPendingConfirmTask(null);
      return;
    }
    const pending = pendingConfirmTask;
    if (!pending) return;
    setPendingConfirmTask(null);

    const item = Object.values(mergedChecklistsByJob)
      .flat()
      .find((i) => i.id === pending.taskId);
    if (!item) return;
    // Attachment presence is enforced server-side (file linked to this step).

    // Keep real attachment presence — do not invent a clip on complete.
    const hadAttachment = !!pending.hasAttachment || !!item.has_attachment;

    const patchLocal = (list: ApiChecklistItem[]) =>
      list.map((i) =>
        i.id === pending.taskId
          ? {
              ...i,
              is_completed: true,
              completed_at: new Date().toISOString(),
              has_attachment: hadAttachment,
            }
          : i,
      );

    setChecklistsByJob((prev) => ({
      ...prev,
      [item.job_id]: patchLocal(prev[item.job_id] ?? []),
    }));
    setChecklistOverrides((prev) =>
      prev[item.job_id]
        ? { ...prev, [item.job_id]: patchLocal(prev[item.job_id] ?? []) }
        : prev,
    );

    const res = await api.patch<{ item: ApiChecklistItem }>(
      `/api/checklist-items/${pending.taskId}`,
      { is_completed: true },
    );
    if (res.status === 200 && res.data?.item) {
      setChecklistsByJob((prev) => ({
        ...prev,
        [item.job_id]: (prev[item.job_id] ?? []).map((i) =>
          i.id === pending.taskId
            ? { ...res.data!.item, has_attachment: hadAttachment }
            : i,
        ),
      }));
    } else {
      void refreshBoard();
      showToast(res.error?.message ?? 'Koraka ni bilo mogoče potrditi.');
    }
  };

  const markChecklistHasAttachment = (jobId: string, taskId: string) => {
    const patch = (list: ApiChecklistItem[]) =>
      list.map((i) => (i.id === taskId ? { ...i, has_attachment: true } : i));
    setChecklistsByJob((prev) => ({
      ...prev,
      [jobId]: patch(prev[jobId] ?? []),
    }));
    setChecklistOverrides((prev) =>
      prev[jobId] ? { ...prev, [jobId]: patch(prev[jobId] ?? []) } : prev,
    );
  };

  const handleCardAttachmentClick = (_workerId: string, taskId: string) => {
    if (!requireBillingUnlocked()) return;
    const item = Object.values(mergedChecklistsByJob)
      .flat()
      .find((i) => i.id === taskId);
    if (!item || isOptimisticId(item.job_id)) return;
    // Incomplete steps: open Dodaj priponko (same popup as Details). Mark.
    if (item.is_completed) return;
    setJobCardAttachTarget({ jobId: item.job_id, taskId: item.id });
  };

  const handleReminderAttachmentClick = (reminderId: string) => {
    if (!requireBillingUnlocked()) return;
    setReminderEditTarget(reminderId);
    setIsAddReminderOpen(true);
  };

  const handleReminderAttachmentDialog = (reminderId: string) => {
    if (!requireBillingUnlocked()) return;
    setAttachmentDialogReminderId(reminderId);
    setIsAttachmentDialogOpen(true);
  };

  const handleOpenReminderAttachment = async (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder?.link) {
      // Preview-only: no file stored → no paperclip should show; never open upload (Mark a16 #2).
      showToast('Priponka ni na voljo.');
      return;
    }

    try {
      const res = await api.get<{
        url: string;
        fileName: string;
        attachmentType?: string | null;
      }>(`/api/office-reminders/${reminderId}/attachment-url`);
      if (res.status === 200 && res.data?.url) {
        setReminderPreview({
          url: res.data.url,
          fileName: res.data.fileName || 'priponka',
          attachmentType: res.data.attachmentType ?? null,
        });
      } else {
        showToast(res.error?.message || 'Datoteke ni bilo mogoče odpreti.');
      }
    } catch (err) {
      console.error('Failed to open attachment:', err);
      showToast('Napaka pri odpiranju datoteke.');
    }
  };

  const handleCardAttachmentFile = async (file: File | null) => {
    if (!requireBillingUnlocked()) return;
    const target = cardAttachTargetRef.current;
    cardAttachTargetRef.current = null;
    if (!file || !target) return;
    const validation = validateJobAttachmentFile(file);
    if (!validation.ok) {
      showToast(jobAttachmentErrorMessage(validation.error, t));
      return;
    }
    const formData = new FormData();
    formData.append('files', file);
    formData.append('checklist_item_id', target.taskId);
    const res = await api.post(`/api/jobs/${target.jobId}/files`, formData);
    if (res.status === 201) {
      markChecklistHasAttachment(target.jobId, target.taskId);
      setPendingConfirmTask((prev) =>
        prev && prev.taskId === target.taskId
          ? {
              ...prev,
              hasAttachment: true,
              attachmentName: file.name,
              attachmentUrl: null,
            }
          : prev,
      );
      showToast(t('modalAttachSuccess'));
      void refreshBoard();
    } else {
      showToast(res.error?.message ?? t('modalAttachFailed'));
    }
  };

  const handleChangeJobStatus = async (jobId: string, status: string) => {
    if (!requireBillingUnlocked()) return;
    if (isOptimisticId(jobId)) return;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: status as ApiJob['status'] } : j,
      ),
    );
    const res = await api.patch<{ job: ApiJob }>(`/api/jobs/${jobId}`, {
      status,
    });
    if (res.status === 200 && res.data) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? res.data!.job : j)));
      void refreshBoard();
    } else {
      void refreshBoard();
      showToast(res.error?.message ?? 'Posodobitev se ni izvedla.');
    }
  };

  const handleAddTask = (taskData: {
    workerId: string;
    opravilo: string;
    kraj: string;
    narocnik: string;
    datum: string;
    steps: { text: string; requiresAttachment: boolean }[];
  }) => {
    if (!requireBillingUnlocked()) return;
    const parsed = parseFlexibleDate(taskData.datum) ?? selectedDate;
    if (parsed.getTime() < startOfLocalDay().getTime()) {
      showToast('Datum ne sme biti v preteklosti.');
      return;
    }
    const scheduledAt = localDayToScheduledAt(parsed);
    const tempId = newOptimisticId();
    const now = new Date().toISOString();
    const nextSeq = Math.max(0, ...jobs.map((j) => j.company_seq), 0) + 1;

    const optimisticJob: ApiJob = {
      id: tempId,
      company_seq: nextSeq,
      status: 'pending',
      title: taskData.opravilo,
      description: null,
      priority: null,
      customer: taskData.narocnik || null,
      location: taskData.kraj || null,
      scheduled_at: scheduledAt,
      started_at: null,
      completed_at: null,
      worker_id: taskData.workerId,
      created_at: now,
      created_by: user?.id ?? null,
      created_by_name: user?.full_name ?? null,
    };

    const optimisticChecklist: ApiChecklistItem[] = taskData.steps.map(
      (step, index) => ({
        id: newOptimisticId('opt-step'),
        job_id: tempId,
        label: step.text,
        order_index: index,
        is_completed: false,
        completed_at: null,
        requires_attachment: step.requiresAttachment,
        has_attachment: false,
      }),
    );

    // Show the card immediately, persist in parallel.
    setJobs((prev) => [optimisticJob, ...prev]);
    setChecklistOverrides((prev) => ({
      ...prev,
      [tempId]: optimisticChecklist,
    }));

    void (async () => {
      const res = await api.post<{ job: ApiJob }>('/api/jobs', {
        title: taskData.opravilo,
        location: taskData.kraj || undefined,
        customer: taskData.narocnik || undefined,
        worker_id: taskData.workerId,
        scheduled_at: scheduledAt,
      });

      if (res.status !== 201 || !res.data) {
        setJobs((prev) => prev.filter((j) => j.id !== tempId));
        setChecklistOverrides((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        showToast(res.error?.message ?? 'Prišlo je do napake. Ni bilo dodano.');
        return;
      }

      const realJob = res.data.job;
      const createdSteps: ApiChecklistItem[] = [];
      for (const step of taskData.steps) {
        const stepRes = await api.post<{
          item?: ApiChecklistItem;
          checklist?: ApiChecklistItem;
        }>(`/api/jobs/${realJob.id}/checklist`, {
          label: step.text,
          requires_attachment: step.requiresAttachment,
        });
        const item = stepRes.data?.item ?? stepRes.data?.checklist;
        if (stepRes.status === 201 && item) createdSteps.push(item);
      }

      setJobs((prev) => prev.map((j) => (j.id === tempId ? realJob : j)));
      setChecklistOverrides((prev) => {
        const next = { ...prev };
        delete next[tempId];
        // Do NOT keep an override for the real job id — it freezes create-time
        // order and undoes checklist reorder after drag (Mark a9 B3).
        return next;
      });
      setChecklistsByJob((prev) => ({
        ...prev,
        [realJob.id]:
          createdSteps.length > 0
            ? createdSteps
            : optimisticChecklist.map((s) => ({ ...s, job_id: realJob.id })),
      }));

      // Functional update — don't use the stale selectedWorkerJobId from create start
      // (user may have opened Details on the optimistic card while POST was in flight).
      setSelectedWorkerJobId((current) =>
        current === tempId ? realJob.id : current,
      );
      void refreshBoard();
    })();
  };

  const handleAddReminder = (reminderData: {
    title: string;
    description: string;
    time: string;
    date: string;
    isUrgent: boolean;
    hasAttachment: boolean;
    attachmentFile: File | null;
    hasEmail: boolean;
    phoneNumber: string;
    hasConfirm: boolean;
    hasDecline: boolean;
  }) => {
    if (!requireBillingUnlocked()) return;
    // If editing an existing reminder, call update instead
    if (reminderEditTarget) {
      handleUpdateReminder(reminderEditTarget, reminderData);
      return;
    }

    const actions: string[] = [];
    // Only mark attachment when a file will actually be stored (Mark a16 #2).
    if (reminderData.hasAttachment && reminderData.attachmentFile) {
      actions.push('attachment');
    }
    if (reminderData.hasEmail) actions.push('email');
    if (reminderData.phoneNumber) actions.push('phone');
    if (reminderData.hasConfirm) actions.push('confirm');
    if (reminderData.hasDecline) actions.push('reject');

    const remindDay =
      parseFlexibleDate(reminderData.date ?? '') ?? selectedDate;
    const remindOnKey = toIsoDate(remindDay);
    const remindTime = normalizeRemindTime(reminderData.time);
    const tempId = newOptimisticId();
    const now = new Date().toISOString();
    const optimistic: ApiOfficeReminder = {
      id: tempId,
      title: reminderData.title,
      description: reminderData.description || null,
      is_urgent: reminderData.isUrgent,
      remind_on: remindOnKey,
      remind_time: remindTime,
      actions,
      action_state: {},
      phone: reminderData.phoneNumber || null,
      link: null,
      order_index: -1,
      hidden_at: null,
      created_at: now,
    };

    // Always write into the remind_on day's cache — not the currently viewed day.
    setReminders((prev) => [optimistic, ...prev], remindOnKey);

    void (async () => {
      const res = await api.post<{ reminder: ApiOfficeReminder }>(
        '/api/office-reminders',
        {
          title: reminderData.title,
          description: reminderData.description || undefined,
          is_urgent: reminderData.isUrgent,
          actions,
          phone: reminderData.phoneNumber || undefined,
          remind_on: remindOnKey,
          remind_time: remindTime || undefined,
        },
      );
      if (res.status === 201 && res.data) {
        const created = res.data.reminder;
        setReminders(
          (prev) => prev.map((r) => (r.id === tempId ? created : r)),
          remindOnKey,
        );

        // Store file on create so PISARNA paperclip can preview it (Mark a16 #2).
        if (reminderData.attachmentFile) {
          const formData = new FormData();
          formData.append('files', reminderData.attachmentFile);
          const uploadRes = await api.post<{ reminder: ApiOfficeReminder }>(
            `/api/office-reminders/${created.id}/files`,
            formData,
          );
          if (uploadRes.status === 201 && uploadRes.data?.reminder) {
            setReminders(
              (prev) =>
                prev.map((r) =>
                  r.id === created.id ? uploadRes.data!.reminder : r,
                ),
              remindOnKey,
            );
          } else {
            showToast(
              uploadRes.error?.message ??
                'Opomnik ustvarjen, vendar priponke ni bilo mogoče naložiti.',
            );
          }
        }

        void refreshBoard();
      } else {
        setReminders((prev) => prev.filter((r) => r.id !== tempId), remindOnKey);
        showToast(res.error?.message ?? 'Opomnika ni bilo mogoče ustvariti.');
      }
    })();
  };

  const handleUpdateReminder = async (reminderId: string, reminderData: {
    title: string;
    description: string;
    time: string;
    date: string;
    isUrgent: boolean;
    hasAttachment: boolean;
    attachmentFile: File | null;
    hasEmail: boolean;
    phoneNumber: string;
    hasConfirm: boolean;
    hasDecline: boolean;
  }) => {
    if (!requireBillingUnlocked()) return;
    const actions: string[] = [];
    if (reminderData.hasAttachment) actions.push('attachment');
    if (reminderData.hasEmail) actions.push('email');
    if (reminderData.phoneNumber) actions.push('phone');
    if (reminderData.hasConfirm) actions.push('confirm');
    if (reminderData.hasDecline) actions.push('reject');

    const remindDay =
      parseFlexibleDate(reminderData.date ?? '') ?? selectedDate;
    const remindOnKey = toIsoDate(remindDay);
    const remindTime = normalizeRemindTime(reminderData.time);

    // Optimistic update
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              title: reminderData.title,
              description: reminderData.description || null,
              is_urgent: reminderData.isUrgent,
              remind_on: remindOnKey,
              remind_time: remindTime,
              actions,
              phone: reminderData.phoneNumber || null,
            }
          : r
      ),
    );

    const res = await api.patch<{ reminder: ApiOfficeReminder }>(
      `/api/office-reminders/${reminderId}`,
      {
        title: reminderData.title,
        description: reminderData.description || undefined,
        is_urgent: reminderData.isUrgent,
        actions,
        phone: reminderData.phoneNumber || undefined,
        remind_on: remindOnKey,
        remind_time: remindTime || undefined,
      },
    );

    if (res.status === 200 && res.data) {
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? res.data!.reminder : r)));
      void refreshBoard();
    } else {
      showToast(res.error?.message ?? 'Opomnika ni bilo mogoče posodobiti.');
      void refreshBoard();
    }
  };

  const handleAddWorker = async (workerData: {
    name: string;
    phone: string;
    email: string;
    role: 'worker' | 'manager';
    password: string;
  }) => {
    if (!requireBillingUnlocked()) {
      throw new Error(billingLockedMessage);
    }
    const res = await api.post<{ user: ApiUser; temporary_password?: string }>(
      '/api/users',
      {
        email: workerData.email,
        full_name: workerData.name,
        role: workerData.role,
        phone: workerData.phone,
        // PIN from the form = Auth password (login: email + PIN).
        password: workerData.password,
      },
    );
    if (res.status !== 201 || !res.data?.user) {
      throw new Error(
        res.error?.message ?? 'Prišlo je do napake. Račun ni bil ustvarjen.',
      );
    }

    const createdUser = res.data.user;
    setCompanyUsers((prev) => {
      if (prev.some((u) => u.id === createdUser.id)) return prev;
      return [...prev, createdUser];
    });
    // Instantly update Add-task / board worker lists (workers query only).
    if (createdUser.role === 'worker') {
      setWorkers((prev) => {
        if (prev.some((w) => w.id === createdUser.id)) return prev;
        return [...prev, createdUser];
      });
    }
    void refreshBoard();
  };

  const handleConfirmReminder = async (id: string) => {
    if (!requireBillingUnlocked()) return;
    if (isOptimisticId(id)) return;
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, action_state: { ...r.action_state, confirmed: true } }
          : r,
      ),
    );
    const res = await api.patch<{ reminder: ApiOfficeReminder }>(
      `/api/office-reminders/${id}`,
      { confirm: true },
    );
    if (res.status === 200 && res.data) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? res.data!.reminder : r)),
      );
    } else {
      void refreshBoard();
    }
  };
  const handleDeclineReminder = async (id: string) => {
    if (!requireBillingUnlocked()) return;
    if (isOptimisticId(id)) return;
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, action_state: { ...r.action_state, rejected: true } }
          : r,
      ),
    );
    const res = await api.patch<{ reminder: ApiOfficeReminder }>(
      `/api/office-reminders/${id}`,
      { reject: true },
    );
    if (res.status === 200 && res.data) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? res.data!.reminder : r)),
      );
    } else {
      void refreshBoard();
    }
  };
  const handleDismissReminder = async (id: string) => {
    if (!requireBillingUnlocked()) return;
    if (isOptimisticId(id)) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    const snapshot = reminders;
    setReminders((prev) => prev.filter((r) => r.id !== id));
    const res = await api.patch(`/api/office-reminders/${id}`, {
      hidden: true,
    });
    if (res.status !== 200) {
      setReminders(snapshot);
      showToast(
        res.error?.message ?? 'Napaka. Opomnika ni bilo mogoče izbrisati.',
      );
    }
  };
  const handleDismissConversation = async (messageIds: string[]) => {
    if (!requireBillingUnlocked()) return;
    if (messageIds.length === 0) return;
    const idSet = new Set(messageIds);
    const snapshot = communications;
    setCommunications((prev) => prev.filter((m) => !idSet.has(m.id)));
    const results = await Promise.all(
      messageIds.map((id) =>
        api.patch(`/api/office/communications/${id}`, { hidden: true }),
      ),
    );
    if (results.some((r) => r.status !== 200)) setCommunications(snapshot);
  };
  const handleDismissJob = async (id: string) => {
    if (!requireBillingUnlocked()) return;
    if (isOptimisticId(id)) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (selectedWorkerJobId === id) {
        setIsWorkerDetailOpen(false);
        setSelectedWorkerJobId(null);
      }
      return;
    }
    const snapshot = jobs;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (selectedWorkerJobId === id) {
      setIsWorkerDetailOpen(false);
      setSelectedWorkerJobId(null);
    }
    const res = await api.patch(`/api/jobs/${id}`, { hidden: true });
    if (res.status !== 200) {
      setJobs(snapshot);
      showToast(res.error?.message ?? 'Kartice ni bilo mogoče skriti.');
    }
  };

  const requestDismissJob = (id: string) => {
    if (!requireBillingUnlocked()) return;
    setPendingDeleteJobId(id);
  };
  const handleJobDragEnd = (event: DragEndEvent) => {
    if (!requireBillingUnlocked()) return;
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
      reordered
        .filter((j) => !isOptimisticId(j.id))
        .map((j, index) =>
          api
            .patch(`/api/jobs/${j.id}`, { display_order: index })
            .catch(() => {}),
        ),
    );
  };

  const handleOpenReply = async (jobId: string) => {
    if (isOptimisticId(jobId)) {
      showToast('Kartica se še shranjuje. Poskusite znova čez trenutek.');
      return;
    }
    if (!communicationAllowed) {
      showCommunicationBlockedToast();
      return;
    }
    setReplyJobId(jobId);
  };

  /** Compose only for workers with a TEREN card on the selected day (Mark). */
  const findComposeJobForWorker = (workerId: string) =>
    activeJobs.find((j) => j.worker_id === workerId && !isOptimisticId(j.id)) ?? null;

  const handleComposeMessage = (workerId: string) => {
    if (!requireBillingUnlocked()) return;
    if (!communicationAllowed) {
      showCommunicationBlockedToast();
      return;
    }
    const job = findComposeJobForWorker(workerId);
    if (!job) {
      showToast(
        'Ta delavec nima odprte kartice za ta dan. Dodajte kartico v stolpec TEREN.',
      );
      return;
    }
    setIsComposeOpen(false);
    void handleOpenReply(job.id);
  };

  const handleSendReply = async () => {
    if (!requireBillingUnlocked()) return;
    if (!communicationAllowed) {
      showCommunicationBlockedToast();
      return;
    }
    const content = replyInput.trim();
    if (!content || !replyJobId) return;
    if (isOptimisticId(replyJobId)) {
      setReplyJobId(null);
      showToast('Kartica se še shranjuje. Poskusite znova čez trenutek.');
      return;
    }
    setReplyInput('');
    try {
      await sendReplyText(content);
      setReplyInput('');
      void refreshBoard();
    } catch (err) {
      logClientError('office.sendReply', err, { jobId: replyJobId });
      showToast(userFacingCatchMessage(err, t('workerMessageSendFailed'), t('workerNetworkError')));
      setReplyInput(content);
    }
  };

  const retryFailedReplyMessage = async (messageId: string) => {
    const failed = replyMessages.find((m) => m.id === messageId);
    if (!failed?.content || !failed.client_message_id) return;
    setReplyMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, delivery_state: 'sending' } : m)),
    );
    try {
      await sendReplyText(failed.content, { clientMessageId: failed.client_message_id });
    } catch (err) {
      logClientError('office.retryReply', err, { jobId: replyJobId, messageId });
      setReplyMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, delivery_state: 'failed' } : m)),
      );
      showToast(userFacingCatchMessage(err, t('workerMessageSendFailed'), t('workerNetworkError')));
    }
  };

  const handleVoiceReplyComplete = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!requireBillingUnlocked()) return;
      if (!replyJobId) return;
      const jobIdForUpload = replyJobId;
      if (isOptimisticId(jobIdForUpload)) {
        setReplyJobId(null);
        showToast('Kartica se še shranjuje. Poskusite znova čez trenutek.');
        return;
      }
      const formData = new FormData();
      formData.append('audio', blob, 'voice-message.webm');
      try {
        const res = await api.post<{ message: typeof replyMessages[number] }>(
          `/api/jobs/${jobIdForUpload}/voice-message`,
          formData,
        );
        if ((res.status === 200 || res.status === 201) && res.data) {
          mergeReplyIncoming(res.data.message);
          void refreshBoard();
        } else {
          logClientError("office.voiceUpload", res.error, {
            status: res.status,
            jobId: jobIdForUpload,
            mimeType,
          });
          showToast(
            apiFailureMessage(res.error, res.status, t("workerVoiceSendFailed"))
          );
        }
      } catch (err) {
        logClientError("office.voiceUpload", err, { jobId: jobIdForUpload, mimeType });
        showToast(
          userFacingCatchMessage(
            err,
            t("workerVoiceSendFailed"),
            t("workerNetworkError")
          )
        );
      }
    },
    [mergeReplyIncoming, refreshBoard, replyJobId, replyMessages, requireBillingUnlocked, showToast, t]
  );

  const handleVoiceReplyError = useCallback(
    (error: unknown) => {
      logClientError("office.voiceRecorder", error);
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
    [showToast, t]
  );

  const replyVoiceRecorder = useVoiceRecorder({
    maxSeconds: LIMITS.VOICE_MAX_SECONDS,
    onComplete: handleVoiceReplyComplete,
    onError: handleVoiceReplyError,
  });

  const handleStartRecordReply = async () => {
    if (!requireBillingUnlocked()) return;
    if (!communicationAllowed) {
      showCommunicationBlockedToast();
      return;
    }
    if (!replyJobId) return;
    if (replyVoiceRecorder.isRecording) return;
    await replyVoiceRecorder.start();
  };

  const replyMessageDisplayText = (message: (typeof replyMessages)[number]) => {
    if (message.message_type !== 'voice') return message.content ?? '';
    if (message.transcription_status === 'pending') return 'Prepis se pripravlja...';
    if (message.transcription_status === 'processing') return 'Prepisovanje...';
    if (message.transcription_status === 'failed') return 'Prepis ni na voljo';
    return message.content ?? 'Prepis ni na voljo';
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t('officeLoading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-100 overflow-x-hidden selection:bg-[#1B3A6B]/10 selection:text-[#1B3A6B] relative bg-[#f3f5f8] dark:bg-[#0b0f19]">
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[13px] font-semibold py-2.5 px-5 rounded-full shadow-lg z-[100] animate-in fade-in duration-200 pointer-events-none">
          {toastMessage}
        </div>
      )}
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

      <header className="sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-3 md:px-6 pt-5">
          <div
            className="relative overflow-hidden w-full max-w-[1232px] mx-auto flex flex-col justify-center"
            style={{
              boxSizing: 'border-box',
              padding: '12px 18px',
              height: '72px',
              background: 'rgba(255, 255, 255, 0.002)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow:
                '0px 14px 38px -22px rgba(15, 23, 42, 0.42), inset 0px 1px 0px 1px #FFFFFF',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '9999px',
            }}
          >
            <div className="absolute inset-0 rounded-full bg-white/36 pointer-events-none" />

            <div
              className="relative z-10 flex flex-row justify-between items-center w-full"
              style={{
                height: '34px',
                alignSelf: 'stretch',
              }}
            >
              <div className="flex items-center gap-3">
                <Link 
                  href="/" 
                  className="flex items-center justify-center bg-white border border-[#E2E8F0] shadow-[0px_1px_2px_rgba(15,23,42,0.04),inset_0px_1px_0px_1px_#FFFFFF] rounded-[6px] hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    boxSizing: "border-box",
                    padding: "6px 16px 6px 8px",
                    width: "184px",
                    height: "52px",
                  }}
                >
                  <Logo className="h-10 w-10" textClassName="text-[18px]" />
                </Link>
                <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
                <div
                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-full hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    background: 'rgba(255, 255, 255, 0.002)',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.04), inset 0px 1px 0px 1px #FFFFFF',
                  }}
                >
                  <span className="text-xs font-normal text-slate-600">
                    {companyNameOverride ?? company?.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-slate-200">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-700">
                      {user?.full_name?.split(' ')[0] || 'Uporabnik'}
                    </span>
                    <span className="text-xs font-normal text-slate-500 capitalize">
                      {user?.role === 'owner' ? 'Vodja' : user?.role === 'manager' ? 'Pisarna' : user?.role === 'worker' ? 'Teren' : ''}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                    {user?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'U'}
                  </div>
                </div>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  title="Išči"
                  className="block sm:block p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (!requireBillingUnlocked()) return;
                    setIsAddWorkerOpen(true);
                  }}
                  title={billingLocked ? billingLockedMessage : "Dodaj sodelavca"}
                  disabled={billingLocked}
                  className="hidden sm:block p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <img
                    src="/adduser.png"
                    alt="Dodaj uporabnika"
                    className="h-5 w-5"
                  />
                </button>
                <Link
                  href="/dashboard/office/db"
                  title="Podatkovni center"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <div className="w-full max-w-[1232px] mx-auto px-6 flex-1" style={{ paddingTop: '32px' }}>
        {billingLocked && user && company && (
          <div className="mb-5">
            <BillingLockBanner
              user={user}
              company={company}
              officeContact={officeContact}
              onActivated={refreshBoard}
            />
          </div>
        )}
        <OfficeDayHeader
          title={t('officeHeading')}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          calendarLabel={t('officePickDate')}
          prevDayLabel={t('officePrevDay')}
          nextDayLabel={t('officeNextDay')}
          todayLabel={t('officeJumpToday')}
        />

        <div className="flex justify-center sm:justify-end mb-12">
          <div className="relative inline-block">
            <div
              className="inline-flex items-center gap-4 px-5 py-3 rounded-full"
              style={{
                width: '370px',
                background: 'rgba(255, 255, 255, 0.002)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow:
                  '0px 14px 38px -22px rgba(15, 23, 42, 0.42), inset 0px 1px 0px 1px #FFFFFF',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[20px] font-bold"
                style={{
                  background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                }}
              >
                AI
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[20px] font-normal"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: '28px',
                    letterSpacing: '-0.5px',
                    color: 'rgba(15, 23, 42, 1)',
                  }}
                >
                  <span className="hidden sm:inline">Povzetek dneva za šefa</span>
                  <span className="sm:hidden">Povzetek za šefa</span>
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '16px',
                    letterSpacing: '-0.3px',
                    color: 'rgba(148, 163, 184, 1)',
                  }}
                >
                  v eni minuti
                </span>
              </div>
            </div>

            <div
              className="flex items-center gap-3 px-5 py-3 z-10 pointer-events-none absolute"
              style={{
                width: '180.42px',
                height: '58px',
                top: 'calc(100% - 25px)',
                right: '0px',
                transform: 'rotate(3deg)',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 1)',
                boxShadow:
                  '0 18px 38px -20px rgba(15,23,42,0.45), inset 0 1px 0 white',
                animation: 'aura-float-soft 4.5s ease-in-out infinite',
              }}
            >
              <div className="flex flex-col">
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0px',
                    color: 'rgba(15, 23, 42, 1)',
                  }}
                >
                  V pripravi
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 300,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0px',
                    color: 'rgba(148, 163, 184, 1)',
                  }}
                >
                  Dodano bo v avgustu
                </span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes aura-float-soft {
            0%, 100% { transform: translateY(0) rotate(3deg); }
            50% { transform: translateY(-8px) rotate(3deg); }
          }
        `}</style>

        <div className="relative" style={{ marginBottom: '32px' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    time={dayUrgent.remind_time?.trim() || '—'}
                    title={dayUrgent.title}
                    subtitle={dayUrgent.description ?? undefined}
                  />
                )}
              </div>
            </SummaryCard>
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="office-grid grid grid-cols-1 lg:grid-cols-3 gap-6 pb-0 lg:pb-20"
        >
          {/* COLUMN 1 — DANES TEREN */}
          <div className="flex flex-col gap-3 office-column-cell">
            <ColumnHeader
              title={t('officeColField')}
              onAddClick={() => {
                if (!requireBillingUnlocked()) return;
                setIsAddTaskOpen(true);
              }}
              addTitle={billingLocked ? billingLockedMessage : t('officeAddTask')}
              addLocked={billingLocked}
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
              className="group md:hover:-translate-y-1 transition-all duration-300"
            >
              {activeJobs.length === 0 &&
                (!shouldShowDummy('teren') ? (
                  <p className="text-sm text-slate-400 text-center py-4">
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
                      mergedChecklistsByJob[job.id] ?? [],
                      worker,
                      t,
                    );
                    return (
                      <SortableItem key={job.id} id={job.id}>
                        <WorkerCard
                          worker={workerCard}
                          onToggleTask={handleToggleTask}
                          onTaskAttachmentClick={handleCardAttachmentClick}
                          date={
                            formatSiDateFromDayKey(
                              isoToLocalDayKey(job.scheduled_at) ??
                                isoToLocalDayKey(job.created_at),
                            ) || formatSiDate(new Date(job.created_at))
                          }
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
              onAddClick={() => {
                if (!requireBillingUnlocked()) return;
                setIsAddReminderOpen(true);
              }}
              addTitle={billingLocked ? billingLockedMessage : t('officeAddReminder')}
              addLocked={billingLocked}
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
                (!shouldShowDummy('pisarna') ? (
                  <p className="text-sm text-white/70 text-center py-4">
                    {t('officeEmptyReminders')}
                  </p>
                ) : (
                  <CommunicationCard
                    order={{
                      id: 'dummy-pisarna',
                      title: 'Dodajte zaznamke za vodjo',
                      description: '',
                      time: '10:30',
                      createdAt: '',
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
                  {dayReminders.map((r) => (
                    <CommunicationCard
                      key={r.id}
                      order={reminderToCard(r, t)}
                      buttonsConfig="dynamic"
                      showRedButton={r.is_urgent}
                      onResolve={() => handleConfirmReminder(r.id)}
                      onDismiss={() => handleDismissReminder(r.id)}
                      onArchive={() => handleDeclineReminder(r.id)}
                      onAttachmentClick={() => handleOpenReminderAttachment(r.id)}
                      onCall={(phone) => {
                        const href = toTelHref(phone || r.phone || '');
                        if (!href) {
                          showToast('Telefonska številka ni na voljo.');
                          return;
                        }
                        window.location.href = href;
                      }}
                    />
                  ))}
            </div>
          </div>

          {/* COLUMN 3 — KOMUNIKACIJA */}
          <div className="flex flex-col gap-3 office-column-cell">
            <ColumnHeader
              title={t('officeColComm')}
              onAddClick={() => {
                if (!requireBillingUnlocked()) return;
                // No TEREN card → nobody to message. No toast at all (Mark:
                // the today-only toast must never appear in this state).
                if (composeWorkerOptions.length === 0) return;
                if (!communicationAllowed) {
                  showCommunicationBlockedToast();
                  return;
                }
                setIsComposeOpen(true);
              }}
              addTitle={
                composeWorkerOptions.length === 0
                  ? t('officeAddMessage')
                  : billingLocked
                    ? billingLockedMessage
                    : !communicationAllowed
                    ? JOB_COMMUNICATION_TODAY_ONLY_MESSAGE
                    : t('officeAddMessage')
              }
              addLocked={
                composeWorkerOptions.length === 0 || !communicationAllowed || billingLocked
              }
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
              {communicationThreads.length === 0 &&
                (!shouldShowDummy('komunikacija') ? (
                  <p className="text-sm text-slate-400 text-center py-4">
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
                    onDismiss={() => dismissDummy('komunikacija')}
                  />
                ))}
              {communicationThreads.map((thread) => {
                const original = thread.messages[0]!;
                // Header = original sender + original send time; title = job (Mark).
                const card = communicationToMessage(original, t);
                return (
                  <OfficeCard
                    key={thread.jobId}
                    message={card}
                    thread={thread.messages.map((m) => ({
                      id: m.id,
                      senderLabel:
                        m.sender_name ||
                        m.worker_name ||
                        t('cardUnknownSender'),
                      text: m.content,
                      time: formatTime(m.created_at),
                      type: m.message_type === 'voice' ? 'glasovno' : 'tekst',
                      attachmentId: m.attachment_id ?? null,
                    }))}
                    iconType="mic"
                    onDismiss={() =>
                      void handleDismissConversation(
                        thread.messages.map((m) => m.id),
                      )
                    }
                    onReply={() => {
                      void handleOpenReply(thread.jobId);
                    }}
                    replyLocked={!communicationAllowed}
                    onReplyBlocked={showCommunicationBlockedToast}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Column navigation arrows (mobile/tablet only) */}
        <div className="flex items-center justify-center gap-8 mt-5 mb-12 lg:hidden">
          <button
            onClick={() => goToColumn(activeTab - 1)}
            disabled={activeTab === 0}
            aria-label="Prejšnji stolpec"
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
            aria-label="Naslednji stolpec"
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
        customerName={selectedJob?.customer ?? null}
        jobTitle={selectedJob?.title ?? null}
        scheduledAt={selectedJob?.scheduled_at ?? null}
        cardMutable={
          billingLocked
            ? false
            : selectedJob
            ? isJobCardMutable({
                scheduled_at: selectedJob.scheduled_at,
                created_at: selectedJob.created_at,
              })
            : true
        }
        onRefresh={() => void refreshBoard()}
        onChecklistReorder={(orderedIds) => {
          if (billingLocked) return;
          if (!selectedWorkerJobId || isOptimisticId(selectedWorkerJobId))
            return;
          const jobId = selectedWorkerJobId;
          const reorder = (list: ApiChecklistItem[]) => {
            const byId = new Map(list.map((i) => [i.id, i]));
            return orderedIds
              .map((id, index) => {
                const item = byId.get(id);
                return item ? { ...item, order_index: index } : null;
              })
              .filter((i): i is ApiChecklistItem => !!i);
          };
          setChecklistsByJob((prev) => ({
            ...prev,
            [jobId]: reorder(prev[jobId] ?? []),
          }));
          setChecklistOverrides((prev) => {
            if (!prev[jobId]) return prev;
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }}
        jobStatus={selectedJob?.status}
        onChangeJobStatus={
          !billingLocked && selectedWorkerJobId
            ? (status) => handleChangeJobStatus(selectedWorkerJobId, status)
            : undefined
        }
        canCancelJob={!billingLocked}
        canManageCustomerNotes={!billingLocked}
        onDeleteCard={
          !billingLocked && selectedWorkerJobId
            ? () => void handleDismissJob(selectedWorkerJobId)
            : undefined
        }
      />

      <input
        ref={cardAttachInputRef}
        type="file"
        className="hidden"
        accept={JOB_ATTACHMENT_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          void handleCardAttachmentFile(file);
        }}
      />

      <Dialog
        open={!!pendingDeleteJobId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteJobId(null);
        }}
      >
        <DialogContent className="max-w-sm w-[90vw]">
          <h3 className="text-lg font-semibold text-slate-900 text-center">
            {t('modalDeleteCardConfirmTitle')}
          </h3>
          <p className="text-sm text-slate-600 text-center mt-2">
            {t('modalDeleteCardConfirmBody')}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setPendingDeleteJobId(null)}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500"
            >
              {t('modalCancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                const id = pendingDeleteJobId;
                setPendingDeleteJobId(null);
                if (id) void handleDismissJob(id);
              }}
              className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold"
            >
              {t('modalDeleteCardSubmit')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingConfirmTask}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmTask(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[calc(100%-2rem)] sm:max-w-[400px] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[28px] border-none shadow-2xl flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="relative bg-white rounded-[20px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPendingConfirmTask(null)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors border-none cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {pendingConfirmTask && (
              <>
                <div className="text-center">
                  <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
                    {pendingConfirmTask.requiresAttachment &&
                    !pendingConfirmTask.hasAttachment
                      ? t('modalConfirmStepMissingTitle')
                      : t('modalConfirmStepTitle')}
                  </h2>
                  <p className="text-slate-500 text-[13px] font-medium leading-relaxed mt-2">
                    {pendingConfirmTask.label}
                  </p>
                </div>

                {pendingConfirmTask.attachmentName && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                    {pendingConfirmTask.attachmentUrl ? (
                      <a
                        href={pendingConfirmTask.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#1B3A6B] font-medium truncate hover:underline"
                      >
                        {pendingConfirmTask.attachmentName}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-700 font-medium truncate">
                        {pendingConfirmTask.attachmentName}
                      </span>
                    )}
                  </div>
                )}

                {pendingConfirmTask.requiresAttachment &&
                !pendingConfirmTask.hasAttachment ? (
                  <div className="flex flex-col gap-3 mt-1">
                    <p className="text-xs text-slate-500 text-center leading-normal">
                      {t('modalConfirmStepMissingDesc')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const p = pendingConfirmTask;
                        if (!p) return;
                        setJobCardAttachTarget({
                          jobId: p.jobId,
                          taskId: p.taskId,
                        });
                      }}
                      className="w-full h-11 rounded-[12px] bg-[#0A1128] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#152042] transition-colors shadow-md shadow-[#0A1128]/10"
                    >
                      Naloži priponko
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="w-full h-11 rounded-[12px] border border-slate-200 text-xs font-bold text-slate-300 uppercase tracking-wider cursor-not-allowed bg-slate-50"
                      title="Najprej naložite priponko"
                    >
                      {t('modalConfirmStepSubmit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingConfirmTask(null)}
                      className="w-full h-11 rounded-[12px] border border-slate-300 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors"
                    >
                      {t('modalCancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-4 pt-2 border-t border-slate-100/55">
                    <button
                      type="button"
                      onClick={() => setPendingConfirmTask(null)}
                      className="flex-1 h-12 rounded-[12px] border border-slate-300 text-slate-700 font-bold text-[13px] uppercase tracking-wider hover:bg-slate-50 transition-colors"
                    >
                      {t('modalCancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void completeConfirmedTask()}
                      className="flex-1 h-12 rounded-[12px] bg-[#0A1128] text-white font-bold text-[13px] uppercase tracking-wider hover:bg-[#152042] transition-colors shadow-lg shadow-[#0A1128]/10"
                    >
                      {t('modalConfirmStepSubmit')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddTaskModal
        isOpen={isAddTaskOpen && !billingLocked}
        onOpenChange={(open) => {
          if (open && !requireBillingUnlocked()) return;
          setIsAddTaskOpen(open);
        }}
        workers={workers.map((w) => ({ id: w.id, name: w.full_name, phone: w.phone }))}
        defaultDate={selectedSiDate}
        onAddTask={handleAddTask}
      />
      <AddReminderModal
        isOpen={isAddReminderOpen && !billingLocked}
        onOpenChange={(open) => {
          if (open && !requireBillingUnlocked()) return;
          setIsAddReminderOpen(open);
          if (!open) setReminderEditTarget(null);
        }}
        defaultDate={selectedSiDate}
        editReminderId={reminderEditTarget}
        editData={reminderEditTarget ? (() => {
          const reminder = reminders.find(r => r.id === reminderEditTarget);
          if (!reminder) return null;
          return {
            title: reminder.title,
            description: reminder.description || '',
            time: reminder.remind_time || '',
            date: reminder.remind_on ? formatSiDate(new Date(reminder.remind_on)) : selectedSiDate,
            isUrgent: reminder.is_urgent,
            hasAttachment: reminder.actions.includes('attachment'),
            hasEmail: reminder.actions.includes('email'),
            phoneNumber: reminder.phone || '',
            hasConfirm: reminder.actions.includes('confirm'),
            hasDecline: reminder.actions.includes('reject'),
          };
        })() : null}
        onOpenAttachmentDialog={handleReminderAttachmentDialog}
        onAddReminder={handleAddReminder}
      />
      <AttachmentDialog
        isOpen={isAttachmentDialogOpen && !billingLocked}
        onOpenChange={(open) => {
          if (open && !requireBillingUnlocked()) return;
          setIsAttachmentDialogOpen(open);
        }}
        targetType="reminder"
        targetId={attachmentDialogReminderId || ""}
        onUploadSuccess={() => void refreshBoard()}
      />
      <AttachmentDialog
        isOpen={!!jobCardAttachTarget && !billingLocked}
        onOpenChange={(open) => {
          if (!open) setJobCardAttachTarget(null);
        }}
        targetType="job"
        targetId={jobCardAttachTarget?.jobId || ""}
        checklistItemId={jobCardAttachTarget?.taskId ?? null}
        onUploadSuccess={() => {
          const target = jobCardAttachTarget;
          if (target) {
            markChecklistHasAttachment(target.jobId, target.taskId);
            setPendingConfirmTask((prev) =>
              prev && prev.taskId === target.taskId
                ? { ...prev, hasAttachment: true }
                : prev,
            );
            showToast(t('modalAttachSuccess'));
          }
          void refreshBoard();
        }}
      />
      <AttachmentLightbox
        item={reminderPreview}
        onClose={() => setReminderPreview(null)}
      />
      <AddWorkerCard
        isOpen={isAddWorkerOpen && !billingLocked}
        onOpenChange={(open) => {
          if (open && !requireBillingUnlocked()) return;
          setIsAddWorkerOpen(open);
        }}
        onAddWorker={handleAddWorker}
        existingUsers={companyUsers.filter((u) => u.is_active)}
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

      <Dialog
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) setComposeWorkerId('');
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[calc(100%-2rem)] sm:max-w-[400px] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[28px] border-none shadow-2xl flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="relative bg-white rounded-[20px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsComposeOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors border-none cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center">
              <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">
                Pošlji sporočilo
              </h2>
              <p className="text-slate-500 text-[13px] font-medium">
                Imeti mora odprto kartico v prvem stolpcu.
              </p>
            </div>

            {/* Recipient selection */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="block text-[10px] font-bold text-[#9CA9BD] uppercase tracking-widest">
                KOMU
              </label>
              <div className="relative w-full">
                <select
                  value={composeWorkerId}
                  onChange={(e) => setComposeWorkerId(e.target.value)}
                  disabled={composeWorkerOptions.length === 0}
                  className="w-full h-11 pl-4 pr-10 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {composeWorkerOptions.length === 0
                      ? 'Imeti mora odprto kartico v prvem stolpcu.'
                      : 'Izberi terenca'}
                  </option>
                  {composeWorkerOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6 w-full justify-center pt-2">
              {/* GLASOVNO */}
              <button
                type="button"
                disabled={!composeWorkerId || billingLocked}
                title={billingLocked ? billingLockedMessage : undefined}
                onClick={() => {
                  if (!composeWorkerId || !requireBillingUnlocked()) return;
                  handleComposeMessage(composeWorkerId);
                }}
                className="flex-1 flex flex-col items-center gap-3 py-4 rounded-[20px] bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed group"
              >
                <div
                  className={`w-16 h-16 rounded-[20px] flex items-center justify-center border transition-all ${
                    composeWorkerId && !billingLocked
                      ? "bg-[#0A1128] border-[#0A1128] text-white shadow-lg shadow-[#0A1128]/20"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <svg
                    width="22"
                    height="25"
                    viewBox="0 0 32 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform group-hover:scale-110 duration-200"
                  >
                    <path
                      d="M20.8542 17.1124C19.2762 18.3754 8.94271 26.6494 6.55021 28.5664L2.50471 24.5209L14.0067 10.2649L20.8542 17.1124ZM28.8177 2.31188C25.7352 -0.770625 20.7357 -0.770625 17.6532 2.31188C15.6207 4.34588 15.4482 6.57487 15.3492 7.36538L23.7642 15.7804C24.4902 15.6994 26.7672 15.5269 28.8177 13.4764C31.9017 10.3939 31.9017 5.39438 28.8177 2.31188ZM14.0667 29.2219C10.6287 29.2219 9.05821 31.3624 6.84271 32.7544C5.27371 33.7384 3.78871 33.2389 3.07471 32.3554C2.81521 32.0389 2.07421 30.8989 3.33571 29.5924L3.14821 29.4049L1.45921 27.7684C-0.598793 29.8924 -0.234293 32.4304 1.04071 34.0039C2.50321 35.8099 5.44471 36.7219 8.23321 34.9714C10.6107 33.4789 11.6637 31.8394 14.0667 29.2219Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className={`text-[12px] font-bold uppercase tracking-wider transition-colors ${
                  composeWorkerId && !billingLocked ? "text-slate-700" : "text-slate-400"
                }`}>
                  GLASOVNO
                </span>
              </button>

              {/* TEKSTOVNO */}
              <button
                type="button"
                disabled={!composeWorkerId || billingLocked}
                title={billingLocked ? billingLockedMessage : undefined}
                onClick={() => {
                  if (!composeWorkerId || !requireBillingUnlocked()) return;
                  handleComposeMessage(composeWorkerId);
                }}
                className="flex-1 flex flex-col items-center gap-3 py-4 rounded-[20px] bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed group"
              >
                <div
                  className={`w-16 h-16 rounded-[20px] flex items-center justify-center border transition-all ${
                    composeWorkerId && !billingLocked
                      ? "bg-[#0A1128] border-[#0A1128] text-white shadow-lg shadow-[#0A1128]/20"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <svg
                    width="26"
                    height="24"
                    viewBox="0 0 40 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform group-hover:scale-110 duration-200"
                  >
                    <path
                      d="M18.478 25.9492C16.388 32.7082 16.002 33.714 16.002 34.5892C16.002 35.5815 16.772 36 17.256 36C17.8 36 19.472 35.3228 24.914 33.1898L18.478 25.9492ZM20.254 23.9513L26.694 31.1962L39.51 16.794C39.836 16.4272 40 15.948 40 15.4643C40 14.985 39.836 14.5035 39.51 14.1345C38.35 12.8317 36.594 10.8563 35.432 9.5535C35.106 9.18675 34.678 9.00225 34.25 9.00225C33.824 9.00225 33.394 9.18675 33.066 9.5535L20.254 23.9513ZM14 21.9375C14 21.033 13.288 20.25 12.5 20.25C7.378 20.25 6.622 20.25 1.5 20.25C0.712 20.25 0 21.033 0 21.9375C0 22.842 0.712 23.625 1.5 23.625H12.5C13.288 23.625 14 22.842 14 21.9375ZM24 15.1875C24 14.283 23.288 13.5 22.5 13.5C17.378 13.5 6.622 13.5 1.5 13.5C0.712 13.5 0 14.283 0 15.1875C0 16.092 0.712 16.875 1.5 16.875H22.5C23.288 16.875 24 16.092 24 15.1875ZM24 8.4375C24 7.533 23.288 6.75 22.5 6.75C17.378 6.75 6.622 6.75 1.5 6.75C0.712 6.75 0 7.533 0 8.4375C0 9.342 0.712 10.125 1.5 10.125H22.5C23.288 10.125 24 9.342 24 8.4375ZM24 1.6875C24 0.783 23.288 0 22.5 0C17.378 0 6.622 0 1.5 0C0.712 0 0 0.783 0 1.6875C0 2.592 0.712 3.375 1.5 3.375H22.5C23.288 3.375 24 2.592 24 1.6875Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className={`text-[12px] font-bold uppercase tracking-wider transition-colors ${
                  composeWorkerId && !billingLocked ? "text-slate-700" : "text-slate-400"
                }`}>
                  TEKSTOVNO
                </span>
              </button>
            </div>
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
            {replyHasMore && (
              <button
                type="button"
                onClick={loadOlderReplyMessages}
                disabled={replyLoadingOlder}
                className="mx-auto block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                {replyLoadingOlder ? 'Nalagam...' : 'Naloži starejša sporočila'}
              </button>
            )}
            {replyMessagesOffline && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Brez povezave. Besedilna sporočila bodo poslana, ko bo povezava znova na voljo.
              </p>
            )}
            {replyLoading && (
              <p className="text-xs text-slate-400 text-center">
                {t('officeLoading')}
              </p>
            )}
            {!replyLoading &&
              replyMessages.map((m) => {
                const isMine = m.sender_id === user?.id;
                const deliveryLabel =
                  m.delivery_state === 'sending'
                    ? 'Pošiljanje...'
                    : m.delivery_state === 'queued'
                      ? 'V čakalni vrsti'
                      : m.delivery_state === 'failed'
                        ? 'Ni poslano'
                        : '';
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
                      {m.message_type === 'voice' && m.attachment_id && (
                        <VoiceMessagePlayer
                          attachmentId={m.attachment_id}
                          className="mb-2"
                          audioClassName="h-9 w-full min-w-[180px]"
                          errorClassName={`mt-1 text-[11px] font-medium ${
                            isMine ? 'text-red-100' : 'text-red-600'
                          }`}
                        />
                      )}
                      <p className={m.message_type === 'voice' ? 'italic' : ''}>
                        {replyMessageDisplayText(m)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 px-1 text-[9px] text-slate-400">
                      <span>
                        {new Date(m.created_at).toLocaleTimeString('sl-SI', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {deliveryLabel && <span>{deliveryLabel}</span>}
                      {m.delivery_state === 'failed' && (
                        <button
                          type="button"
                          onClick={() => retryFailedReplyMessage(m.id)}
                          className="font-semibold text-red-500 hover:underline"
                        >
                          Ponovi
                        </button>
                      )}
                    </div>
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
              disabled={billingLocked}
              title={billingLocked ? billingLockedMessage : undefined}
              className="flex-1 h-10 text-xs px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleStartRecordReply}
              disabled={billingLocked || !communicationAllowed || replyVoiceRecorder.isRecording}
              title={billingLocked ? billingLockedMessage : t('workerVoice')}
              className={`w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0 ${
                !billingLocked && communicationAllowed && !replyVoiceRecorder.isRecording
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'opacity-45 cursor-not-allowed'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSendReply}
              disabled={billingLocked || !communicationAllowed}
              title={billingLocked ? billingLockedMessage : undefined}
              className="w-10 h-10 rounded-xl bg-[#0A1128] hover:bg-[#152042] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={replyVoiceRecorder.isRecording} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm w-[90vw] bg-[#0F172A] text-white border-none"
        >
          <div className="flex flex-col items-center text-center py-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                replyVoiceRecorder.isSaving || replyVoiceRecorder.isPaused
                  ? "bg-slate-600"
                  : "bg-red-600 animate-pulse"
              }`}
            >
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-base tracking-wide">
              {replyVoiceRecorder.isSaving ? t("workerVoiceSaving") : t("workerRecording")}
            </h3>
            <span className="mt-1 text-sm font-semibold text-slate-400">
              00:{replyVoiceRecorder.seconds.toString().padStart(2, "0")}
            </span>
            {!replyVoiceRecorder.isSaving && (
              <div className="mt-8 flex w-full justify-center gap-3">
                {replyVoiceRecorder.isPaused ? (
                  <Button
                    onClick={replyVoiceRecorder.resume}
                    className="h-11 rounded-full bg-white px-5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    {t("workerResumeRecord")}
                  </Button>
                ) : (
                  <Button
                    onClick={replyVoiceRecorder.pause}
                    disabled={!replyVoiceRecorder.canPause}
                    className="h-11 rounded-full bg-white/10 px-5 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("workerPauseRecord")}
                  </Button>
                )}
                <Button
                  onClick={replyVoiceRecorder.finish}
                  className="h-11 rounded-full bg-white px-5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  {t("workerStopRecord")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
