"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Worker } from "@/lib/mockData";
import { api } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import type { JobStatus } from "@/config/constants";
import { Paperclip, GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AuraLabel,
  AuraInput,
  AuraSelect,
  AuraFileInput,
  AuraIconButton,
  AuraCheckbox,
  AuraTextarea,
  auraCard,
  auraButton,
} from "./AuraForm";
import { describeTimelineEvent, attachmentDisplayTitle, shouldShowTimelineEvent } from "@/lib/timeline/describe";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchJobFiles, fetchJobTimeline } from "@/lib/query/office";
import { parseNoteText } from "./CustomerNotesBanner";
import { formatSiDateFromIso, formatSiTimeFromIso } from "@/lib/officeDate";
import { isOptimisticId } from "@/lib/optimisticId";

interface CustomerNoteDto {
  id: string;
  note: string;
  created_at?: string;
}

interface WorkerDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
  jobId: string | null;
  cardNumber?: string | null;
  customerName?: string | null;
  inlineDrawer?: boolean;
  onRefresh?: () => void;
  jobStatus?: JobStatus;
  onChangeJobStatus?: (status: JobStatus) => void;
  canCancelJob?: boolean;
  onDeleteCard?: () => void;
  canManageCustomerNotes?: boolean;
  onChecklistReorder?: (orderedIds: string[]) => void;
}

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  time?: string;
  attachment: boolean;
  requiresAttachment?: boolean;
}

interface AttachmentItem {
  id: string;
  name: string;
  time: string;
  date: string;
  url: string | null;
  ocrText: string | null;
  documentType: string | null;
  documentPreview: string | null;
  checklistItemId: string | null;
  attachmentType: string | null;
}

interface TimelineItem {
  id: string;
  time: string;
  text: string;
  type: "step" | "attachment" | "message" | "voice" | "other";
  fileId?: string;
}

const TIMELINE_TYPE_BY_EVENT: Record<string, TimelineItem["type"]> = {
  checklist_completed: "step",
  image_uploaded: "attachment",
  document_uploaded: "attachment",
  file_hidden: "attachment",
  ocr_completed: "attachment",
  message_sent: "message",
  voice_message_transcribed: "voice",
};

function nowTime() {
  return new Date().toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === "object") {
    if ("message" in err && typeof (err as Record<string, unknown>).message === "string") {
      return (err as Record<string, unknown>).message as string;
    }
    if ("error" in err && typeof (err as Record<string, unknown>).error === "string") {
      return (err as Record<string, unknown>).error as string;
    }
  }
  return "Nepričakovana napaka. Poskusite znova.";
};

interface SortableTaskItemProps {
  task: TaskItem;
  onClick: () => void;
  onDelete: () => void;
  onOpenAttachment?: () => void;
  deleteLabel: string;
}

function SortableTaskItem({ task, onClick, onDelete, onOpenAttachment, deleteLabel }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: task.completed });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 w-full group"
    >
      {task.completed ? (
        <span className="shrink-0 p-1 w-6" aria-hidden />
      ) : (
      <button
        type="button"
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="shrink-0 p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 bg-transparent border-none outline-none"
        aria-label="Premakni korak"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 flex-1 text-left bg-transparent border-none p-0 outline-none"
      >
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: "16px",
            height: "16px",
            background: task.completed ? "transparent" : "#E1E4E8",
            borderRadius: "4px",
            border: task.completed ? "2px solid #41C46D" : "none",
          }}
        >
          {task.completed && (
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="#41C46D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontSize: "13px",
            color: task.completed ? "#94A3B8" : "#1E293B",
          }}
          className="flex-1 truncate"
        >
          {task.text}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {(task.attachment || task.requiresAttachment) && (
            <span
              role={onOpenAttachment ? "button" : undefined}
              tabIndex={onOpenAttachment ? 0 : undefined}
              onClick={(e) => {
                if (!onOpenAttachment) return;
                e.stopPropagation();
                onOpenAttachment();
              }}
              onKeyDown={(e) => {
                if (!onOpenAttachment) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenAttachment();
                }
              }}
              className="inline-flex"
              title={task.attachment ? "Odpri priponko" : undefined}
            >
              <Paperclip
                className={`w-3.5 h-3.5 shrink-0 ${task.attachment ? "text-slate-300" : "text-slate-400"}`}
              />
            </span>
          )}
          {task.completed && task.time && (
            <span className="text-xs text-[#D3D3D3] font-normal">{task.time}</span>
          )}
        </div>
      </button>
      {!task.completed && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 text-slate-400 hover:text-red-500 bg-transparent border-none outline-none transition-colors"
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function WorkerDetailModal({
  isOpen,
  onOpenChange,
  worker,
  jobId,
  cardNumber = null,
  customerName = null,
  inlineDrawer = false,
  onRefresh,
  jobStatus,
  onChangeJobStatus,
  onDeleteCard,
  canManageCustomerNotes = false,
  onChecklistReorder,
}: WorkerDetailModalProps) {
  const { t } = useLanguage();
  const [addStepOpen, setAddStepOpen] = React.useState(false);
  const [stepText, setStepText] = React.useState("");
  const [stepRequiresAttachment, setStepRequiresAttachment] = React.useState(false);
  const [confirmStepId, setConfirmStepId] = React.useState<string | null>(null);
  const [confirmUploading, setConfirmUploading] = React.useState(false);
  const [confirmStepFile, setConfirmStepFile] = React.useState<File | null>(null);
  const [deleteStepId, setDeleteStepId] = React.useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = React.useState<AttachmentItem | null>(null);
  const [attachOnlyOpen, setAttachOnlyOpen] = React.useState(false);
  const [attachOnlyFile, setAttachOnlyFile] = React.useState<File | null>(null);
  const [attachOnlyUploading, setAttachOnlyUploading] = React.useState(false);
  const [attachForStepId, setAttachForStepId] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setToastMessage(null);
      }
    }, 2500);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const resolvedCustomerName = (customerName ?? "").trim();
  const [customerNotes, setCustomerNotes] = React.useState<CustomerNoteDto[]>([]);
  const [saveNoteOpen, setSaveNoteOpen] = React.useState(false);
  const [saveNoteChecked, setSaveNoteChecked] = React.useState(true);
  const [saveNoteText, setSaveNoteText] = React.useState("");
  const [saveNoteCustomer, setSaveNoteCustomer] = React.useState("");
  const [saveNoteSaving, setSaveNoteSaving] = React.useState(false);
  const notesRequestRef = React.useRef(0);
  const completeAfterSaveRef = React.useRef(false);
  const ocrTimeoutRef = React.useRef<number | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = React.useState(false);
  const [newNoteText, setNewNoteText] = React.useState("");
  const [newNoteType, setNewNoteType] = React.useState<"once" | "always">("once");
  const [newNoteSaving, setNewNoteSaving] = React.useState(false);
  const [tasksSyncNonce, setTasksSyncNonce] = React.useState(0);

  const fromWorkerTasks = (workerTasks: Worker["tasks"]): TaskItem[] => {
    const mapped = workerTasks.map((t) => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      time: t.completedAt,
      attachment: t.hasAttachment || false,
      requiresAttachment: t.requiresAttachment || false,
    }));
    const done = mapped.filter((t) => t.completed);
    const todo = mapped.filter((t) => !t.completed);
    return [...done, ...todo];
  };

  const [tasks, setTasks] = React.useState<TaskItem[]>(() => fromWorkerTasks(worker?.tasks || []));
  const tasksDirtyRef = React.useRef(false);
  React.useEffect(() => {
    if (tasksDirtyRef.current) return;
    setTasks(fromWorkerTasks(worker?.tasks || []));
  }, [worker, tasksSyncNonce]);

  const [deleteCardOpen, setDeleteCardOpen] = React.useState(false);
  const [stepPosition, setStepPosition] = React.useState(tasks.length + 1);
  const queryClient = useQueryClient();
  const jobReady = !!jobId && !isOptimisticId(jobId);
  const workerRef = React.useRef(worker);
  workerRef.current = worker;

  React.useEffect(() => {
    setStepPosition(tasks.length + 1);
  }, [tasks.length]);

  const filesQuery = useQuery({
    queryKey: queryKeys.job.files(jobId || ""),
    queryFn: () => fetchJobFiles(jobId!),
    enabled: isOpen && jobReady,
    staleTime: 30_000,
  });
  const timelineQuery = useQuery({
    queryKey: queryKeys.job.timeline(jobId || ""),
    queryFn: () => fetchJobTimeline(jobId!),
    enabled: isOpen && jobReady,
    staleTime: 30_000,
  });

  const attachments: AttachmentItem[] = React.useMemo(
    () =>
      (filesQuery.data ?? []).map((f) => ({
        id: f.id,
        name: f.file_name,
        time: formatSiTimeFromIso(f.created_at),
        date: formatSiDateFromIso(f.created_at),
        url: f.signed_url,
        ocrText: f.ocr_text,
        documentType: f.document_type,
        documentPreview: f.document_preview,
        checklistItemId: f.checklist_item_id ?? null,
        attachmentType: f.attachment_type ?? null,
      })),
    [filesQuery.data]
  );

  const timeline: TimelineItem[] = React.useMemo(
    () =>
      (timelineQuery.data ?? [])
        .slice()
        .reverse()
        .filter((e) => shouldShowTimelineEvent(e))
        .map((e) => ({
          id: e.id,
          time: formatSiTimeFromIso(e.created_at),
          text: describeTimelineEvent(e, t, cardNumber),
          type: TIMELINE_TYPE_BY_EVENT[e.event_type] ?? "other",
          fileId: e.metadata?.file_id as string | undefined,
        })),
    [timelineQuery.data, t, cardNumber]
  );

  React.useEffect(() => {
    if (!filesQuery.data) return;
    setTasks((prev) => {
      let changed = false;
      const next = prev.map((task) => {
        const linked = (filesQuery.data ?? []).some((f) => f.checklist_item_id === task.id);
        if (linked === task.attachment) return task;
        changed = true;
        return { ...task, attachment: linked };
      });
      return changed ? next : prev;
    });
  }, [filesQuery.data]);

  const filesLoading = filesQuery.isFetching && !filesQuery.data;
  const timelineLoading = timelineQuery.isFetching && !timelineQuery.data;

  const refreshFilesAndTimeline = React.useCallback(async () => {
    if (!jobId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.job.files(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.job.timeline(jobId) }),
    ]);
  }, [jobId, queryClient]);

  const scheduleOcrRefresh = React.useCallback(() => {
    if (!jobId) return;
    if (ocrTimeoutRef.current) window.clearTimeout(ocrTimeoutRef.current);
    ocrTimeoutRef.current = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.job.files(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.job.timeline(jobId) });
    }, 2500);
  }, [jobId, queryClient]);

  const loadCustomerNotes = React.useCallback(async (name: string) => {
    const requestId = ++notesRequestRef.current;
    if (name.length < 2) {
      setCustomerNotes([]);
      return;
    }
    try {
      const res = await api.get<{ notes: CustomerNoteDto[] }>(
        `/api/customers/notes?name=${encodeURIComponent(name)}`
      );
      if (notesRequestRef.current !== requestId) return;
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300 && res.data) {
        setCustomerNotes(res.data.notes);
      } else {
        setCustomerNotes([]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setCustomerNotes([]);
      showToast(getErrorMessage(err));
    }
  }, [showToast]);

  async function postCustomerNote(
    noteText: string,
    noteType: "once" | "always",
    customerName: string,
    force: boolean,
    isRetry: boolean,
  ): Promise<{ success: boolean; shouldRetry?: boolean }> {
    if (!noteText || !customerName) {
      return { success: false };
    }
    try {
      const finalNoteContent = noteType === "once"
        ? JSON.stringify({ text: noteText, jobId })
        : noteText;
      const res = await api.post<{ note: CustomerNoteDto }>(`/api/customers/notes`, {
        customer_name: customerName,
        note: finalNoteContent,
        force,
        job_id: jobId ?? undefined,
      });
      if (!mountedRef.current) return { success: false };
      if (res.status === 409) {
        if (isRetry) {
          showToast("Opomba je podvojena in je ni bilo mogoče shraniti.");
          return { success: false };
        }
        return { success: false, shouldRetry: true };
      }
      if (res.status >= 200 && res.status < 300) {
        return { success: true };
      }
      showToast(res.error?.message ?? "Opombe ni bilo mogoče shraniti.");
      return { success: false };
    } catch (err) {
      showToast(getErrorMessage(err));
      return { success: false };
    }
  }

  const submitNote = React.useCallback(async (force: boolean, isRetry = false): Promise<boolean> => {
    const noteText = newNoteText.trim();
    if (!noteText) return false;
    if (!resolvedCustomerName) {
      showToast("Naročnik je obvezen za dodajanje opombe.");
      return false;
    }
    const result = await postCustomerNote(noteText, newNoteType, resolvedCustomerName, force, isRetry);
    if (result.shouldRetry) {
      const okAnyway = window.confirm(t("customerNotesDuplicateConfirm"));
      if (okAnyway) {
        return submitNote(true, true);
      }
      return false;
    }
    if (result.success) {
      setNewNoteText("");
      setIsAddNoteOpen(false);
      if (mountedRef.current) {
        void loadCustomerNotes(resolvedCustomerName);
        void refreshFilesAndTimeline();
      }
    }
    return result.success;
  }, [newNoteText, newNoteType, resolvedCustomerName, jobId, t, showToast, loadCustomerNotes, refreshFilesAndTimeline]);

  const handleAddNote = async (force = false) => {
    if (newNoteSaving) return;
    setNewNoteSaving(true);
    try {
      await submitNote(force);
    } finally {
      if (mountedRef.current) {
        setNewNoteSaving(false);
      }
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setCustomerNotes([]);
      setSaveNoteOpen(false);
      setSaveNoteText("");
      setSaveNoteCustomer("");
      setSaveNoteChecked(true);
      completeAfterSaveRef.current = false;
      tasksDirtyRef.current = false;
      if (ocrTimeoutRef.current) {
        window.clearTimeout(ocrTimeoutRef.current);
        ocrTimeoutRef.current = null;
      }
      return;
    }
    void loadCustomerNotes(resolvedCustomerName);
  }, [isOpen, resolvedCustomerName, loadCustomerNotes]);

  const handleDeleteCustomerNote = async (id: string) => {
    try {
      const res = await api.delete<{ deleted: boolean }>(`/api/customer-notes/${id}`);
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300) {
        setCustomerNotes((prev) => prev.filter((n) => n.id !== id));
      } else {
        showToast(res.error?.message ?? "Opombe ni bilo mogoče odstraniti.");
      }
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  const openSaveNoteDialog = React.useCallback((thenComplete: boolean) => {
    completeAfterSaveRef.current = thenComplete;
    setSaveNoteChecked(true);
    setSaveNoteText("");
    setSaveNoteCustomer(resolvedCustomerName);
    setSaveNoteOpen(true);
  }, [resolvedCustomerName]);

  const requestComplete = React.useCallback(() => {
    openSaveNoteDialog(true);
  }, [openSaveNoteDialog]);

  const finishComplete = React.useCallback(() => {
    const shouldComplete = completeAfterSaveRef.current;
    completeAfterSaveRef.current = false;
    setSaveNoteOpen(false);
    setSaveNoteText("");
    setSaveNoteCustomer("");
    if (shouldComplete) onChangeJobStatus?.("completed");
  }, [onChangeJobStatus]);

  const submitSaveNote = React.useCallback(async (force: boolean, isRetry = false): Promise<boolean> => {
    const note = saveNoteText.trim();
    const customer = saveNoteCustomer.trim() || resolvedCustomerName;
    if (!saveNoteChecked || !note) {
      finishComplete();
      return true;
    }
    if (!customer) {
      showToast(t("customerNotesSaveCustomerRequired"));
      return false;
    }
    const result = await postCustomerNote(note, "always", customer, force, isRetry);
    if (result.shouldRetry) {
      const okAnyway = window.confirm(t("customerNotesDuplicateConfirm"));
      if (okAnyway) {
        return submitSaveNote(true, true);
      }
      return false;
    }
    if (result.success) {
      if (mountedRef.current) {
        setCustomerNotes((prev) => {
          const newNote: CustomerNoteDto = { id: `temp-${Date.now()}`, note, created_at: new Date().toISOString() };
          return [newNote, ...prev];
        });
        void loadCustomerNotes(customer);
      }
      finishComplete();
      return true;
    }
    return false;
  }, [saveNoteText, saveNoteCustomer, resolvedCustomerName, saveNoteChecked, jobId, t, showToast, finishComplete, loadCustomerNotes]);

  const handleSaveCustomerNote = async (force = false) => {
    if (saveNoteSaving) return;
    setSaveNoteSaving(true);
    try {
      await submitSaveNote(force);
    } finally {
      if (mountedRef.current) {
        setSaveNoteSaving(false);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!jobReady || tasks.some((t) => isOptimisticId(t.id))) {
      showToast("Počakajte, kartica se še shranjuje…");
      return;
    }
    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);
    if (!activeTask || !overTask || activeTask.completed || overTask.completed) return;
    const completed = tasks.filter((t) => t.completed);
    const incomplete = tasks.filter((t) => !t.completed);
    const oldIndex = incomplete.findIndex((t) => t.id === active.id);
    const newIndex = incomplete.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = [...tasks];
    const reorderedIncomplete = arrayMove(incomplete, oldIndex, newIndex);
    const reordered = [...completed, ...reorderedIncomplete];
    tasksDirtyRef.current = true;
    setTasks(reordered);
    try {
      const results = await Promise.all(
        reordered.map((task, index) =>
          api.patch(`/api/checklist-items/${task.id}`, { order_index: index })
        )
      );
      if (!mountedRef.current) return;
      if (results.some((r) => r.status < 200 || r.status >= 300)) {
        throw new Error("Vrstnega reda ni bilo mogoče shraniti.");
      }
      onChecklistReorder?.(reordered.map((t) => t.id));
      tasksDirtyRef.current = false;
      void onRefresh?.();
    } catch (err) {
      if (mountedRef.current) {
        setTasks(previous);
      }
      tasksDirtyRef.current = false;
      setTasksSyncNonce((n) => n + 1);
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  const resetAddStep = () => {
    setStepText("");
    setStepRequiresAttachment(false);
    setStepPosition(tasks.length + 1);
  };

  const handleToggleComplete = async (task: TaskItem) => {
    try {
      const res = await api.patch<{ item: { id: string; is_completed: boolean; completed_at: string | null } }>(
        `/api/checklist-items/${task.id}`,
        { is_completed: true }
      );
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300 && res.data) {
        const serverTime = res.data.item.completed_at
          ? formatSiTimeFromIso(res.data.item.completed_at)
          : nowTime();
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === task.id
              ? { ...t, completed: true, time: serverTime }
              : t
          );
          const done = updated.filter((t) => t.completed);
          const todo = updated.filter((t) => !t.completed);
          return [...done, ...todo];
        });
        onRefresh?.();
      } else {
        showToast(res.error?.message ?? t("modalConfirmStepMissingTitle"));
      }
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await api.delete(`/api/checklist-items/${taskId}`);
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        onRefresh?.();
      } else {
        showToast("Koraka ni bilo mogoče izbrisati.");
      }
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepText.trim() || !jobId) return;
    if (!jobReady) {
      showToast(t("modalAttachFailed"));
      return;
    }
    const insertIndex = Math.min(
      Math.max(stepPosition - 1, completedCount),
      tasks.length
    );
    try {
      const res = await api.post<{ item: { id: string; label: string; is_completed: boolean; requires_attachment: boolean } }>(
        `/api/jobs/${jobId}/checklist`,
        {
          label: stepText.trim(),
          requires_attachment: stepRequiresAttachment,
          order_index: insertIndex,
        }
      );
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300 && res.data) {
        const item = res.data.item;
        const newTask: TaskItem = {
          id: item.id,
          text: item.label,
          completed: false,
          attachment: false,
          requiresAttachment: item.requires_attachment,
        };
        setTasks((prev) => {
          const next = [...prev.slice(0, insertIndex), newTask, ...prev.slice(insertIndex)];
          const done = next.filter((t) => t.completed);
          const todo = next.filter((t) => !t.completed);
          return [...done, ...todo];
        });
        setAddStepOpen(false);
        resetAddStep();
        onRefresh?.();
      } else {
        showToast(res.error?.message ?? "Koraka ni bilo mogoče dodati.");
      }
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  const uploadJobFile = async (file: File, checklistItemId?: string): Promise<boolean> => {
    if (!jobId) return false;
    const formData = new FormData();
    formData.append("files", file);
    if (checklistItemId) formData.append("checklist_item_id", checklistItemId);
    try {
      const res = await api.post<{ files: unknown[] }>(`/api/jobs/${jobId}/files`, formData);
      if (!mountedRef.current) return false;
      if (res.status >= 200 && res.status < 300) {
        if (checklistItemId) {
          setTasks((prev) =>
            prev.map((t) => (t.id === checklistItemId ? { ...t, attachment: true } : t))
          );
        }
        await refreshFilesAndTimeline();
        scheduleOcrRefresh();
        onRefresh?.();
        showToast(t("modalAttachSuccess"));
        return true;
      }
      showToast(res.error?.message ?? t("modalAttachFailed"));
      return false;
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
      return false;
    }
  };

  const openAttachDialog = (stepId?: string | null) => {
    setAttachForStepId(stepId ?? null);
    setAttachOnlyFile(null);
    setAttachOnlyOpen(true);
  };

  const handleHideAttachment = async (fileId: string) => {
    try {
      const res = await api.patch(`/api/files/${fileId}`, { hidden: true });
      if (!mountedRef.current) return;
      if (res.status >= 200 && res.status < 300) {
        if (jobId) {
          queryClient.setQueryData(queryKeys.job.files(jobId), (prev: unknown) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.filter((f: { id: string }) => f.id !== fileId);
          });
        }
        setPreviewAttachment(null);
        void queryClient.invalidateQueries({ queryKey: queryKeys.job.timeline(jobId || "") });
      } else {
        showToast(res.error?.message ?? "Priponke ni bilo mogoče skriti.");
      }
    } catch (err) {
      if (mountedRef.current) {
        showToast(getErrorMessage(err));
      }
    }
  };

  if (!worker) {
    if (!isOpen) return null;
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          style={{
            background: "rgba(241, 245, 249, 1)",
            border: "2px solid rgba(243, 242, 241, 0.2)",
            boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.15)",
            borderRadius: "32px",
            padding: "24px",
            maxWidth: "375px",
            width: "90%",
          }}
          className="outline-none"
        >
          <p className="text-sm text-slate-400 text-center py-8">{t("officeLoading")}</p>
        </DialogContent>
      </Dialog>
    );
  }

  const firstIncompleteId = tasks.find((t) => !t.completed)?.id ?? null;

  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

  const canPreviewAttachment = (att: AttachmentItem): boolean =>
  !!att.documentPreview && !!att.documentType && att.documentType !== "other";

function TimelineIcon({ type }: { type: TimelineItem["type"] }) {
  switch (type) {
    case "voice":
      return (
        <svg width="12" height="12" viewBox="0 0 32 36" fill="#6D778E" className="shrink-0 mt-0.5">
          <path d="M20.8542 17.1124C19.2762 18.3754 8.94271 26.6494 6.55021 28.5664L2.50471 24.5209L14.0067 10.2649L20.8542 17.1124ZM28.8177 2.31188C25.7352 -0.770625 20.7357 -0.770625 17.6532 2.31188C15.6207 4.34588 15.4482 6.57487 15.3492 7.36538L23.7642 15.7804C24.4902 15.6994 26.7672 15.5269 28.8177 13.4764C31.9017 10.3939 31.9017 5.39438 28.8177 2.31188ZM14.0667 29.2219C10.6287 29.2219 9.05821 31.3624 6.84271 32.7544C5.27371 33.7384 3.78871 33.2389 3.07471 32.3554C2.81521 32.0389 2.07421 30.8989 3.33571 29.5924L3.14821 29.4049L1.45921 27.7684C-0.598793 29.8924 -0.234293 32.4304 1.04071 34.0039C2.50321 35.8099 5.44471 36.7219 8.23321 34.9714C10.6107 33.4789 11.6637 31.8394 14.0667 31.8394C15.6207 31.8394 17.0367 32.5354 19.2942 35.9989L21.4857 34.5709C19.3962 31.3609 17.3337 29.2219 14.0667 29.2219Z" />
        </svg>
      );
    case "attachment":
      return <Paperclip className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />;
    default:
      return null;
  }
}

const renderContentBody = () => (
    <div className="flex flex-col gap-[48px] text-[#1E293B]">
      {(onDeleteCard || jobStatus === "completed") && (
        <div className="flex items-center justify-end gap-3">
          {jobStatus === "completed" && (
            <button
              type="button"
              onClick={() => openSaveNoteDialog(false)}
              className="text-xs text-amber-700/80 hover:text-amber-800 bg-transparent border-none p-0 outline-none cursor-pointer"
            >
              {t("customerNotesSaveBtn")}
            </button>
          )}
          {onDeleteCard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteCardOpen(true);
              }}
              className="text-xs text-slate-400 hover:text-slate-500 bg-transparent border-none p-0 outline-none cursor-pointer"
            >
              {t("modalDeleteCard")}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              color: "#5A5A65",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            OPOMBE:
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewNoteText("");
              setNewNoteType("once");
              setIsAddNoteOpen(true);
            }}
            className="w-5 h-5 flex items-center justify-center hover:scale-[1.05] transition-all bg-transparent border-none p-0 outline-none cursor-pointer"
          >
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706" stroke="#6D778E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {(() => {
            const displayedNotes = customerNotes
              .map((n) => {
                const { text, jobId: noteJobId } = parseNoteText(n.note);
                return { ...n, noteText: text, noteJobId };
              })
              .filter((n) => !n.noteJobId || n.noteJobId === jobId);

            if (displayedNotes.length === 0) {
              return (
                <span className="text-xs text-slate-400">
                  Ni opomb za tega naročnika.
                </span>
              );
            }

            return displayedNotes.map((n, idx) => (
              <div key={n.id} className="flex items-start gap-2.5 group">
                <div className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-xs text-slate-700 flex-1 min-w-0 font-medium leading-relaxed">
                  {n.noteText}
                </span>
                {canManageCustomerNotes && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomerNote(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-0.5"
                    title={t("customerNotesDelete")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              color: "#5A5A65",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {t("modalSectionTasks")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAddStepOpen(true);
              }}
              className="w-5 h-5 flex items-center justify-center hover:scale-[1.05] transition-all bg-transparent border-none p-0 outline-none cursor-pointer"
            >
              <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706" stroke="#6D778E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTaskDragEnd}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onClick={() => {
                    if (task.completed) return;
                    if (task.id !== firstIncompleteId) return;
                    setConfirmStepId(task.id);
                  }}
                  onOpenAttachment={() => {
                    const att = attachments.find((a) => a.checklistItemId === task.id);
                    if (att) {
                      setPreviewAttachment(att);
                      return;
                    }
                    openAttachDialog(task.id);
                  }}
                  onDelete={() => setDeleteStepId(task.id)}
                  deleteLabel={t("modalDeleteStep")}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
<div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: "'PT Sans', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              color: "#5A5A65",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {t("modalSectionAttachments")}
          </span>
          <button
            onClick={() => {
              // Job-level Priponke only — never auto-link to a checklist step.
              openAttachDialog(null);
            }}
            className="w-5 h-5 flex items-center justify-center hover:scale-[1.05] transition-all bg-transparent border-none p-0 outline-none cursor-pointer"
          >
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706" stroke="#6D778E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {attachments.length === 0 && (
            <span className="text-xs text-slate-400">
              {filesLoading ? t("officeLoading") : t("modalEmptyAttachments")}
            </span>
          )}
          {attachments.map((att) => {
            const { title, showFileNameSub } = attachmentDisplayTitle(
              {
                fileName: att.name,
                attachmentType: att.attachmentType,
                documentType: att.documentType,
              },
              t
            );
            const showPreview = canPreviewAttachment(att);
            return (
              <button
                key={att.id}
                type="button"
                onClick={() => setPreviewAttachment(att)}
                className="flex items-start justify-between w-full text-left bg-transparent border-none p-0 outline-none group gap-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    style={{
                      fontFamily: "'PT Sans', sans-serif",
                      fontSize: "13px",
                      color: "#1E293B",
                    }}
                    className="group-hover:text-[#1B3A6B] transition-colors"
                  >
                    {title}
                  </span>
                  {showFileNameSub && (
                    <span className="text-[11px] text-slate-400 truncate">{att.name}</span>
                  )}
                  {showPreview && (
                    <span className="text-[11px] text-slate-500 line-clamp-2 whitespace-pre-line">
                      {att.documentPreview}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#64748B] font-normal shrink-0 text-right whitespace-nowrap">
                  {att.date ? `${att.date} · ${att.time}` : att.time}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            color: "#5A5A65",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {t("modalSectionTimeline")}
        </span>

        <div className="flex flex-col gap-3">
          {timeline.length === 0 && (
            <span className="text-xs text-slate-400">
              {timelineLoading ? t("officeLoading") : t("modalEmptyTimeline")}
            </span>
          )}
          {timeline.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <span className="text-xs text-[#64748B] font-normal shrink-0 mt-0.5 whitespace-nowrap">
                  {event.time}
                </span>
                <span
                  style={{
                    fontFamily: "'PT Sans', sans-serif",
                    fontSize: "13px",
                    color: "#1E293B",
                    lineHeight: "16px",
                  }}
                >
                  {event.text}
                </span>
              </div>
              {event.type === "attachment" && event.fileId && (
                <button
                  type="button"
                  onClick={() => {
                    const att = attachments.find((a) => a.id === event.fileId);
                    if (att) setPreviewAttachment(att);
                  }}
                  className="shrink-0 mt-0.5 bg-transparent border-none p-0 outline-none cursor-pointer hover:text-slate-400 transition-colors"
                >
                  <TimelineIcon type={event.type} />
                </button>
              )}
              {event.type !== "attachment" && <TimelineIcon type={event.type} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 text-white text-[11px] font-semibold py-2 px-4 rounded-full shadow-lg animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}
      <style>{`
        .custom-ios-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-ios-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 16px 0;
        }
        .custom-ios-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(109, 119, 142, 0.45);
          border-radius: 9999px;
        }
        .custom-ios-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(109, 119, 142, 0.65);
        }
      `}</style>

      {inlineDrawer ? (
        isOpen && (
          <div
            className="absolute inset-x-0 bottom-0 top-[100px] rounded-t-[32px] border-t border-slate-200/50 shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{
              background: "rgba(241, 245, 249, 1)",
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-200/50 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t("modalDetailsDrawer")}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6 custom-ios-scrollbar">
              {renderContentBody()}
            </div>
          </div>
        )
      ) : (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={false}
            style={{
              background: "rgba(241, 245, 249, 1)",
              border: "2px solid rgba(243, 242, 241, 0.2)",
              boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.15)",
              borderRadius: "32px",
              padding: "24px",
              maxWidth: "375px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            className="outline-none custom-ios-scrollbar"
          >
            {renderContentBody()}
          </DialogContent>
        </Dialog>
      )}

      {}
      <Dialog open={addStepOpen} onOpenChange={(open) => {
        setAddStepOpen(open);
        if (open) setStepPosition(tasks.length + 1);
        if (!open) resetAddStep();
      }}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "360px",
            width: "90%",
          }}
          className="outline-none"
        >
          <form onSubmit={handleAddStep} className={auraCard}>
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalStepTitle")}
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <AuraLabel strong>{t("modalStepLabel")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={stepText}
                    onChange={(e) => setStepText(e.target.value)}
                    maxLength={30}
                    required
                    strong
                    placeholder={t("modalStepPlaceholder")}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-slate-400">
                      {stepText.length}/30
                    </span>
                  </div>
                </div>
                <div>
                  <AuraLabel>{t("modalStepPosition")}</AuraLabel>
                  <AuraSelect
                    value={Math.max(stepPosition, completedCount + 1)}
                    onChange={(e) => setStepPosition(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: tasks.length - completedCount + 1 },
                      (_, i) => completedCount + 1 + i
                    ).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos === tasks.length + 1
                          ? t("modalStepPositionEnd")
                          : `${pos}. mesto`}
                      </option>
                    ))}
                  </AuraSelect>
                </div>
                <AuraIconButton
                  active={stepRequiresAttachment}
                  onClick={() => setStepRequiresAttachment(!stepRequiresAttachment)}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  }
                  label={t("modalStepAttachmentToggle")}
                  title={t("modalStepAttachmentTitle")}
                />
              </div>
              <button type="submit" className={auraButton}>
                {t("modalStepSubmit")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={attachOnlyOpen} onOpenChange={(open) => {
        setAttachOnlyOpen(open);
        if (!open) {
          setAttachOnlyFile(null);
          setAttachForStepId(null);
        }
      }}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "360px",
            width: "90%",
          }}
          className="outline-none"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!attachOnlyFile) return;
              setAttachOnlyUploading(true);
              try {
                const success = await uploadJobFile(
                  attachOnlyFile,
                  attachForStepId ?? undefined
                );
                if (success) {
                  setAttachOnlyOpen(false);
                  setAttachOnlyFile(null);
                  setAttachForStepId(null);
                }
              } finally {
                setAttachOnlyUploading(false);
              }
            }}
            className={auraCard}
          >
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalAttachTitle")}
                </h3>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                <AuraFileInput
                  id="attach-only-file"
                  onFile={setAttachOnlyFile}
                  onReject={showToast}
                />
                {attachOnlyFile && (
                  <span className="text-[11px] text-slate-500 truncate">
                    {attachOnlyFile.name}
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!attachOnlyFile || attachOnlyUploading}
                  className="w-[160px] h-9 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase transition-colors"
                >
                  {attachOnlyUploading ? t("modalUploading") : t("modalAdd")}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!confirmStepId} onOpenChange={(open) => {
        if (!open) {
          setConfirmStepId(null);
          setConfirmStepFile(null);
        }
      }}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "380px",
            width: "90%",
          }}
          className="outline-none"
        >
          {(() => {
            const task = tasks.find(t => t.id === confirmStepId);
            if (!task) return null;
            const hasLinked =
              !!task.attachment ||
              attachments.some((a) => a.checklistItemId === task.id);
            // Job-level Priponke files do not satisfy step attachment.
            const missingAttachment = !!task.requiresAttachment && !hasLinked;
            const stepAttachment = attachments.find(
              (a) => a.checklistItemId === task.id
            );
            return (
              <div className={auraCard}>
                <div className="flex flex-col gap-4 text-slate-800">
                  <div className="text-center">
                    {missingAttachment ? (
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                        {t("modalConfirmStepMissingTitle")}
                      </h3>
                    ) : (
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                        {t("modalConfirmStepTitle")}
                      </h3>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 text-center">
                    <strong>{task.text}</strong>
                  </p>
                  {!missingAttachment && stepAttachment && (
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(stepAttachment)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-[#1B3A6B] font-medium truncate">
                        {stepAttachment.name}
                      </span>
                    </button>
                  )}
                  {missingAttachment && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-slate-500 text-center">
                        {t("modalConfirmStepMissingDesc")}
                      </p>
                      <AuraFileInput
                        id="confirm-step-attachment"
                        onFile={setConfirmStepFile}
                        onReject={showToast}
                      />
                      {confirmStepFile && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {confirmStepFile.name}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-center gap-2">
                    {missingAttachment ? (
                      <button
                        type="button"
                        disabled={!confirmStepFile || confirmUploading}
                        onClick={async () => {
                          if (!confirmStepFile) return;
                          setConfirmUploading(true);
                          try {
                            const success = await uploadJobFile(confirmStepFile, task.id);
                            if (success) {
                              setConfirmStepFile(null);
                            }
                          } finally {
                            setConfirmUploading(false);
                          }
                        }}
                        className="w-[160px] h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase transition-colors"
                      >
                        {confirmUploading ? t("modalUploading") : t("modalAdd")}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmStepId(null)}
                          className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500"
                        >
                          {t("modalCancel")}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleToggleComplete(task);
                            setConfirmStepId(null);
                          }}
                          className="flex-1 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white text-xs font-semibold uppercase transition-colors"
                        >
                          {t("modalConfirmStepSubmit")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!deleteStepId} onOpenChange={(open) => {
        if (!open) setDeleteStepId(null);
      }}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "380px",
            width: "90%",
          }}
          className="outline-none"
        >
          {(() => {
            const task = tasks.find(t => t.id === deleteStepId);
            if (!task) return null;
            return (
              <div className={auraCard}>
                <div className="flex flex-col gap-4 text-slate-800">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                      {t("modalDeleteStepConfirmTitle")}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 text-center">
                    {t("modalDeleteStepConfirmPrefix")} <strong className="text-slate-900">{task.text}</strong>{t("modalDeleteStepConfirmSuffix")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStepId(null)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {t("modalCancel")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleDeleteTask(task.id);
                        setDeleteStepId(null);
                      }}
                      className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                    >
                      {t("modalDeleteStepSubmit")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={deleteCardOpen} onOpenChange={setDeleteCardOpen}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "380px",
            width: "90%",
          }}
          className="outline-none"
        >
          <div className={auraCard}>
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalDeleteCardConfirmTitle")}
                </h3>
              </div>
              <p className="text-sm text-slate-600 text-center">
                {t("modalDeleteCardConfirmBody")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteCardOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {t("modalCancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteCardOpen(false);
                    onOpenChange(false);
                    onDeleteCard?.();
                  }}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                  {t("modalDeleteCardSubmit")}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => {
        if (!open) setPreviewAttachment(null);
      }}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "420px",
            width: "90%",
          }}
          className="outline-none"
        >
          {previewAttachment && (
            <div className={auraCard}>
              <div className="flex flex-col gap-4 text-slate-800">
                <div className="text-center">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    {t("modalPreviewTitle")}
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {(() => {
                    const url = previewAttachment.url;
                    const isImage =
                      previewAttachment.attachmentType === "image" ||
                      /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(previewAttachment.name);
                    const isPdf =
                      previewAttachment.attachmentType === "pdf" ||
                      /\.pdf$/i.test(previewAttachment.name);
                    if (url && isImage) {
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video rounded-xl bg-slate-100 border border-slate-200 overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={previewAttachment.name}
                            className="w-full h-full object-contain"
                          />
                        </a>
                      );
                    }
                    if (url && isPdf) {
                      return (
                        <iframe
                          src={url}
                          title={previewAttachment.name}
                          className="w-full aspect-video rounded-xl bg-slate-100 border border-slate-200"
                        />
                      );
                    }
                    if (url) {
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-video rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                          <Paperclip className="w-10 h-10 text-slate-400" />
                          <span className="text-xs text-[#1B3A6B] font-medium">
                            {previewAttachment.name}
                          </span>
                        </a>
                      );
                    }
                    return (
                      <div className="aspect-video rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Paperclip className="w-10 h-10 text-slate-300" />
                      </div>
                    );
                  })()}
                  {(() => {
                    const { title, showFileNameSub } = attachmentDisplayTitle(
                      {
                        fileName: previewAttachment.name,
                        attachmentType: previewAttachment.attachmentType,
                        documentType: previewAttachment.documentType,
                      },
                      t
                    );
                    return (
                      <>
                        <p className="text-sm font-medium text-slate-800">{title}</p>
                        {showFileNameSub && (
                          <p className="text-xs text-slate-500">{previewAttachment.name}</p>
                        )}
                      </>
                    );
                  })()}
                  <p className="text-xs text-slate-500">{t("modalPreviewAddedAtPrefix")} {previewAttachment.time} · {previewAttachment.date}</p>
                </div>
                {previewAttachment.documentPreview &&
                  previewAttachment.documentType &&
                  previewAttachment.documentType !== "other" && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("modalDocumentPreviewLabel")}
                    </span>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {previewAttachment.documentPreview}
                      </p>
                    </div>
                  </div>
                )}
                {previewAttachment.documentType &&
                  previewAttachment.documentType !== "other" && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("modalOcrTextLabel")}
                    </span>
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {previewAttachment.ocrText || t("modalOcrTextNone")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleHideAttachment(previewAttachment.id)}
                    className="flex-1 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                  >
                    {t("modalHideAttachment")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(null)}
                    className="flex-1 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white text-xs font-semibold transition-colors"
                  >
                    {t("modalClose")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {}
      <Dialog
        open={saveNoteOpen}
        onOpenChange={(open) => {
          if (!open && !saveNoteSaving) finishComplete();
        }}
      >
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "420px",
            width: "90%",
          }}
          className="outline-none"
        >
          <div className={auraCard}>
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("customerNotesSaveTitle")}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {t("customerNotesSaveHint")}
                </p>
              </div>
              <AuraCheckbox
                checked={saveNoteChecked}
                onChange={setSaveNoteChecked}
                label={t("customerNotesSaveCheckbox")}
              />
              {saveNoteChecked && (
                <>
                  <div>
                    <AuraLabel>{t("customerNotesSaveCustomerLabel")}</AuraLabel>
                    <AuraInput
                      type="text"
                      value={saveNoteCustomer}
                      onChange={(e) => setSaveNoteCustomer(e.target.value.slice(0, 40))}
                      maxLength={40}
                      placeholder={t("customerNotesSaveCustomerPlaceholder")}
                    />
                  </div>
                  <div>
                    <AuraLabel>{t("customerNotesSaveBtn")}</AuraLabel>
                    <AuraTextarea
                      value={saveNoteText}
                      onChange={(e) => setSaveNoteText(e.target.value.slice(0, 280))}
                      placeholder={t("customerNotesSavePlaceholder")}
                      rows={3}
                      maxLength={280}
                    />
                    <span className="text-[10px] text-slate-400">{saveNoteText.length}/280</span>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saveNoteSaving}
                  onClick={() => finishComplete()}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {t("customerNotesSkipBtn")}
                </button>
                <button
                  type="button"
                  disabled={
                    saveNoteSaving ||
                    (saveNoteChecked &&
                      (!saveNoteText.trim() || !(saveNoteCustomer.trim() || resolvedCustomerName)))
                  }
                  onClick={() => void handleSaveCustomerNote(false)}
                  className="flex-1 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {t("customerNotesSaveBtn")}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "380px",
            width: "90%",
          }}
          className="outline-none"
        >
          <div className={auraCard}>
            <div className="flex flex-col gap-4 text-[#1E293B]">
              <div className="text-center pb-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  Zaznamki za naročnika
                </h3>
              </div>
              <div>
                <AuraLabel className="text-[10px] uppercase text-slate-500 mb-1.5 block font-bold">NAROČNIK:</AuraLabel>
                <AuraInput
                  type="text"
                  value={resolvedCustomerName}
                  disabled
                  className="bg-slate-100/60 border-none text-slate-500 select-none cursor-not-allowed"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <AuraLabel className="text-[10px] uppercase text-slate-500 block font-bold mb-0">ZAZNAMEK:</AuraLabel>
                  <span className="text-[10px] font-bold text-slate-400">{newNoteText.length}/60</span>
                </div>
                <AuraTextarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value.slice(0, 60))}
                  maxLength={60}
                  placeholder="Zapišite poljubno opombo za tega naročnika..."
                  rows={3}
                  className="bg-slate-50 border-none ring-1 ring-[#1B3A6B]/15 rounded focus:ring-1 focus:ring-[#1B3A6B]/15 focus:outline-none"
                />
                <p className="mt-1.5 text-[10px] text-slate-400/90 leading-normal">
                  Če gre za več opomnikov, je priporočljivo, da so zapisani ločeno, vsak za sebe.
                </p>
              </div>
              <div className="flex flex-col gap-3 my-2 pt-2 border-t border-[#1B3A6B]/10">
                <button
                  type="button"
                  onClick={() => setNewNoteType("once")}
                  className="flex items-center gap-3 text-left w-full bg-transparent border-none p-0 outline-none cursor-pointer group"
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    newNoteType === "once"
                      ? "border-green-600 bg-green-50 text-green-600"
                      : "border-slate-300 hover:border-slate-400 text-transparent"
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                    Zaznamek samo tokrat
                  </span>
                </button>
                <div className="text-[9px] font-extrabold text-slate-400/70 tracking-wider pl-8 uppercase">
                  ali
                </div>
                <button
                  type="button"
                  onClick={() => setNewNoteType("always")}
                  className="flex items-center gap-3 text-left w-full bg-transparent border-none p-0 outline-none cursor-pointer group"
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    newNoteType === "always"
                      ? "border-green-600 bg-green-50 text-green-600"
                      : "border-slate-300 hover:border-slate-400 text-transparent"
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                    Zaznamek vsakič pri tem naročniku; služi kot opomnik kasneje
                  </span>
                </button>
              </div>
              <button
                type="button"
                disabled={newNoteSaving || !newNoteText.trim()}
                onClick={() => void handleAddNote()}
                className={`${auraButton.replace("w-full", "w-[160px]")} self-center disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500`}
              >
                DODAJ
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
