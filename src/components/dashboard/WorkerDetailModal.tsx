"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Worker } from "@/lib/mockData";
import { api } from "@/lib/api-client";
import { useLanguage } from "@/lib/useLanguage";
import type { TranslationKey } from "@/lib/translations";
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
  auraCard,
  auraButton,
} from "./AuraForm";

interface WorkerDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
  jobId: string | null;
  inlineDrawer?: boolean;
  onRefresh?: () => void;
  jobStatus?: JobStatus;
  onChangeJobStatus?: (status: JobStatus) => void;
  canCancelJob?: boolean;
}

const STATUS_BADGE_CLASSES: Record<JobStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  in_progress: "bg-blue-50 text-blue-600",
  waiting: "bg-amber-50 text-amber-600",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const STATUS_LABEL_KEY: Record<JobStatus, TranslationKey> = {
  pending: "jobStatusPending",
  in_progress: "jobStatusInProgress",
  waiting: "jobStatusWaiting",
  completed: "jobStatusCompleted",
  cancelled: "jobStatusCancelled",
};

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
}

interface TimelineItem {
  id: string;
  time: string;
  text: string;
  type: "step" | "attachment" | "message" | "voice" | "other";
}

interface ApiJobFile {
  id: string;
  file_name: string;
  created_at: string;
  signed_url: string | null;
  ocr_text: string | null;
}

interface ApiTimelineEvent {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

// Event-type strings and metadata field names below must match exactly what
// createTimelineEvent() callers actually emit (see grep across src/app/api)
// — a mismatched case silently falls through to the raw event_type default.
function snippet(text: unknown, max = 40): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const trimmed = text.trim();
  return trimmed.length > max ? `"${trimmed.slice(0, max)}…"` : `"${trimmed}"`;
}

function describeTimelineEvent(e: ApiTimelineEvent, t: (key: TranslationKey) => string): string {
  const meta = e.metadata ?? {};
  switch (e.event_type) {
    case "job_created":
      return `${t("timelineJobCreated")}: ${meta.title ?? ""}`;
    case "worker_assigned":
      return meta.worker_name
        ? `${t("timelineWorkerAssigned")}: ${meta.worker_name}`
        : t("timelineWorkerAssigned");
    case "job_updated":
      return t("timelineJobUpdated");
    case "status_changed":
      return meta.to && typeof meta.to === "string" && meta.to in STATUS_LABEL_KEY
        ? `${t("timelineStatusChanged")}: ${t(STATUS_LABEL_KEY[meta.to as JobStatus])}`
        : t("timelineStatusChanged");
    case "job_completed":
      return t("timelineJobCompleted");
    case "checklist_completed":
      return `${t("timelineChecklistCompleted")}: ${meta.label ?? ""}`;
    case "image_uploaded":
      return `${t("timelineImageUploaded")}: ${meta.file_name ?? ""}`;
    case "document_uploaded":
      return `${t("timelineDocumentUploaded")}: ${meta.file_name ?? ""}`;
    case "file_hidden":
      return `${t("timelineFileHidden")}: ${meta.file_name ?? ""}`;
    case "ocr_completed":
      return t("timelineOcrCompleted");
    case "voice_message_transcribed": {
      const base = meta.transcribed ? t("timelineVoiceTranscribed") : t("timelineVoiceReceived");
      const s = snippet(meta.content);
      return s ? `${base}: ${s}` : base;
    }
    case "message_sent": {
      const s = snippet(meta.content);
      return s ? `${t("timelineMessageSent")}: ${s}` : t("timelineMessageSent");
    }
    case "notification_deleted":
      return t("timelineNotificationDeleted");
    default:
      return e.event_type.replace(/_/g, " ");
  }
}

function nowTime() {
  return new Date().toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

interface SortableTaskItemProps {
  task: TaskItem;
  onClick: () => void;
  onDelete: () => void;
  deleteLabel: string;
}

function SortableTaskItem({ task, onClick, onDelete, deleteLabel }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 flex-1 text-left bg-transparent border-none p-0 outline-none"
      >
        {/* Checkbox */}
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

        {/* Text */}
        <span
          style={{
            fontFamily: "'PT Sans', sans-serif",
            fontSize: "13px",
            color: task.completed ? "#94A3B8" : "#1E293B",
          }}
          className="flex-1 truncate"
        >
          {task.text}
          {task.requiresAttachment && !task.attachment && (
            <span className="ml-1.5 text-[10px] text-red-500 font-semibold">*</span>
          )}
        </span>

        {/* Completion time / clip icon */}
        <div className="flex items-center gap-1.5 ml-auto">
          {task.attachment && (
            <Paperclip className="w-3.5 h-3.5 text-slate-300 shrink-0" />
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
          className="shrink-0 p-1 text-slate-300 hover:text-red-500 bg-transparent border-none outline-none opacity-60 group-hover:opacity-100 transition-opacity"
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
  inlineDrawer = false,
  onRefresh,
  jobStatus,
  onChangeJobStatus,
  canCancelJob = false,
}: WorkerDetailModalProps) {
  const { t, lang } = useLanguage();
  const [addStepOpen, setAddStepOpen] = React.useState(false);

  // Sub-dialog: Dodaj korak
  const [stepText, setStepText] = React.useState("");
  const [stepRequiresAttachment, setStepRequiresAttachment] = React.useState(false);

  // Confirm step completion
  const [confirmStepId, setConfirmStepId] = React.useState<string | null>(null);
  const [confirmUploading, setConfirmUploading] = React.useState(false);

  // Confirm step deletion
  const [deleteStepId, setDeleteStepId] = React.useState<string | null>(null);

  // Attachment preview
  const [previewAttachment, setPreviewAttachment] = React.useState<AttachmentItem | null>(null);

  // Attach-only dialog
  const [attachOnlyOpen, setAttachOnlyOpen] = React.useState(false);
  const [attachOnlyFile, setAttachOnlyFile] = React.useState<File | null>(null);
  const [attachOnlyUploading, setAttachOnlyUploading] = React.useState(false);

  const fromWorkerTasks = (workerTasks: Worker["tasks"]): TaskItem[] =>
    workerTasks.map(t => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      time: t.completedAt,
      attachment: t.hasAttachment || false,
      requiresAttachment: t.requiresAttachment || false,
    }));

  // Core lists — seeded from the worker prop (already sourced from real
  // checklist data by the parent dashboard's mapper), then mutated directly
  // against the backend from here.
  const [tasks, setTasks] = React.useState<TaskItem[]>(() => fromWorkerTasks(worker?.tasks || []));
  React.useEffect(() => {
    setTasks(fromWorkerTasks(worker?.tasks || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker]);

  // Position where the next new step will be inserted (1-based)
  const [stepPosition, setStepPosition] = React.useState(tasks.length + 1);

  const [attachments, setAttachments] = React.useState<AttachmentItem[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineItem[]>([]);

  const loadFilesAndTimeline = React.useCallback(async () => {
    if (!jobId) return;
    const [filesRes, timelineRes] = await Promise.all([
      api.get<{ files: ApiJobFile[] }>(`/api/jobs/${jobId}/files`),
      api.get<{ timeline: ApiTimelineEvent[] }>(`/api/jobs/${jobId}/timeline`),
    ]);
    setAttachments(
      (filesRes.data?.files ?? []).map((f) => ({
        id: f.id,
        name: f.file_name,
        time: new Date(f.created_at).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" }),
        date: new Date(f.created_at).toLocaleDateString("sl-SI"),
        url: f.signed_url,
        ocrText: f.ocr_text,
      }))
    );
    setTimeline(
      (timelineRes.data?.timeline ?? [])
        .slice()
        .reverse()
        .map((e) => ({
          id: e.id,
          time: new Date(e.created_at).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" }),
          text: describeTimelineEvent(e, t),
          type: TIMELINE_TYPE_BY_EVENT[e.event_type] ?? "other",
        }))
    );
  }, [jobId, t]);

  React.useEffect(() => {
    if (isOpen && jobId) loadFilesAndTimeline();
  }, [isOpen, jobId, loadFilesAndTimeline]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag-reordering is visual-only within this session — it is not persisted
  // to order_index on the backend (no reorder endpoint exists for checklist
  // items in the current API surface).
  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      setTasks(reordered);
      // Best-effort persistence — silently ignored if the caller isn't
      // allowed to reorder (e.g. a worker viewing their own checklist).
      Promise.all(
        reordered.map((task, index) =>
          api.patch(`/api/checklist-items/${task.id}`, { order_index: index }).catch(() => {})
        )
      );
    }
  };

  const resetAddStep = () => {
    setStepText("");
    setStepRequiresAttachment(false);
    setStepPosition(tasks.length + 1);
  };

  const handleToggleComplete = async (task: TaskItem) => {
    const res = await api.patch<{ item: { id: string; is_completed: boolean; completed_at: string | null } }>(
      `/api/checklist-items/${task.id}`,
      { is_completed: true }
    );
    if (res.status === 200 && res.data) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, completed: true, time: nowTime() }
            : t
        )
      );
      onRefresh?.();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await api.delete(`/api/checklist-items/${taskId}`);
    if (res.status === 200 || res.status === 204) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      onRefresh?.();
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepText.trim() || !jobId) return;
    const res = await api.post<{ item: { id: string; label: string; is_completed: boolean; requires_attachment: boolean } }>(
      `/api/jobs/${jobId}/checklist`,
      { label: stepText, requires_attachment: stepRequiresAttachment }
    );
    if (res.status === 201 && res.data) {
      const item = res.data.item;
      const newTask: TaskItem = {
        id: item.id,
        text: item.label,
        completed: false,
        attachment: false,
        requiresAttachment: item.requires_attachment,
      };
      const insertIndex = Math.min(Math.max(stepPosition - 1, 0), tasks.length);
      setTasks((prev) => [...prev.slice(0, insertIndex), newTask, ...prev.slice(insertIndex)]);
      setAddStepOpen(false);
      resetAddStep();
      onRefresh?.();
    }
  };

  const uploadJobFile = async (file: File, checklistItemId?: string): Promise<boolean> => {
    if (!jobId) return false;
    const formData = new FormData();
    formData.append("files", file);
    if (checklistItemId) formData.append("checklist_item_id", checklistItemId);
    const res = await api.post<{ files: ApiJobFile[] }>(`/api/jobs/${jobId}/files`, formData);
    if (res.status === 201) {
      await loadFilesAndTimeline();
      return true;
    }
    return false;
  };

  const handleHideAttachment = async (fileId: string) => {
    const res = await api.patch(`/api/files/${fileId}`, { hidden: true });
    if (res.status === 200) {
      setAttachments((prev) => prev.filter((a) => a.id !== fileId));
      setPreviewAttachment(null);
    } else {
      alert(res.error?.message ?? "Failed to hide attachment.");
    }
  };

  if (!worker) return null;

  const renderStatusSection = () => {
    if (!jobStatus || !onChangeJobStatus) return null;
    const isTerminal = jobStatus === "completed" || jobStatus === "cancelled";
    return (
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
            {t("modalSectionStatus")}
          </span>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE_CLASSES[jobStatus]}`}>
            {t(STATUS_LABEL_KEY[jobStatus])}
          </span>
        </div>
        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {jobStatus === "pending" && (
              <button
                onClick={() => onChangeJobStatus("in_progress")}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-[#1B3A6B] text-white hover:bg-[#142c52] transition-colors cursor-pointer"
              >
                {t("jobActionStart")}
              </button>
            )}
            {jobStatus === "in_progress" && (
              <>
                <button
                  onClick={() => onChangeJobStatus("waiting")}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t("jobActionWait")}
                </button>
                <button
                  onClick={() => onChangeJobStatus("completed")}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-[#1B3A6B] text-white hover:bg-[#142c52] transition-colors cursor-pointer"
                >
                  {t("jobActionComplete")}
                </button>
              </>
            )}
            {jobStatus === "waiting" && (
              <>
                <button
                  onClick={() => onChangeJobStatus("in_progress")}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t("jobActionResume")}
                </button>
                <button
                  onClick={() => onChangeJobStatus("completed")}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-[#1B3A6B] text-white hover:bg-[#142c52] transition-colors cursor-pointer"
                >
                  {t("jobActionComplete")}
                </button>
              </>
            )}
            {canCancelJob && (
              <button
                onClick={() => onChangeJobStatus("cancelled")}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                {t("jobActionCancel")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContentBody = () => (
    <div className="flex flex-col gap-[48px] text-[#1E293B]">
      {renderStatusSection()}
      {/* Section: Predvidena dela */}
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
          {/* Plus action icon to add a new step */}
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

        {/* Task lists with checkboxes */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTaskDragEnd}
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onClick={() => {
                    if (task.completed) return;
                    setConfirmStepId(task.id);
                  }}
                  onDelete={() => setDeleteStepId(task.id)}
                  deleteLabel={t("modalDeleteStep")}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Section: Priponke */}
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
          {/* Plus action icon to add attachment only */}
          <button
            onClick={() => setAttachOnlyOpen(true)}
            className="w-5 h-5 flex items-center justify-center hover:scale-[1.05] transition-all bg-transparent border-none p-0 outline-none cursor-pointer"
          >
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.9705 9.48535H9.48528M9.48528 9.48535H1M9.48528 9.48535V1.00007M9.48528 9.48535V17.9706" stroke="#6D778E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {attachments.length === 0 && (
            <span className="text-xs text-slate-400">{t("modalEmptyAttachments")}</span>
          )}
          {attachments.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() => setPreviewAttachment(att)}
              className="flex items-center justify-between w-full text-left bg-transparent border-none p-0 outline-none group"
            >
              <span
                style={{
                  fontFamily: "'PT Sans', sans-serif",
                  fontSize: "13px",
                  color: "#1E293B",
                }}
                className="group-hover:text-[#1B3A6B] transition-colors"
              >
                {att.name}
              </span>
              <span className="text-xs text-[#64748B] font-normal">{att.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section: Timeline */}
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
            <span className="text-xs text-slate-400">{t("modalEmptyTimeline")}</span>
          )}
          {timeline.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <span className="text-xs text-[#64748B] font-normal shrink-0 mt-0.5">
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
              {event.type === "attachment" && (
                <Paperclip className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
              )}
              {event.type === "voice" && (
                <svg width="12" height="12" viewBox="0 0 32 36" fill="#6D778E" className="shrink-0 mt-0.5">
                  <path d="M20.8542 17.1124C19.2762 18.3754 8.94271 26.6494 6.55021 28.5664L2.50471 24.5209L14.0067 10.2649L20.8542 17.1124ZM28.8177 2.31188C25.7352 -0.770625 20.7357 -0.770625 17.6532 2.31188C15.6207 4.34588 15.4482 6.57487 15.3492 7.36538L23.7642 15.7804C24.4902 15.6994 26.7672 15.5269 28.8177 13.4764C31.9017 10.3939 31.9017 5.39438 28.8177 2.31188ZM14.0667 29.2219C10.6287 29.2219 9.05821 31.3624 6.84271 32.7544C5.27371 33.7384 3.78871 33.2389 3.07471 32.3554C2.81521 32.0389 2.07421 30.8989 3.33571 29.5924L3.14821 29.4049L1.45921 27.7684C-0.598793 29.8924 -0.234293 32.4304 1.04071 34.0039C2.50321 35.8099 5.44471 36.7219 8.23321 34.9714C10.6107 33.4789 11.6637 31.8394 14.0667 31.8394C15.6207 31.8394 17.0367 32.5354 19.2942 35.9989L21.4857 34.5709C19.3962 31.3609 17.3337 29.2219 14.0667 29.2219Z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
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
            {/* Close Bar */}
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

            {/* Scrollable Body */}
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

      {/* ── Sub-Dialog: Dodaj še en korak ── */}
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
              {/* Header */}
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalStepTitle")}
                </h3>
              </div>

              {/* Form */}
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
                    value={stepPosition}
                    onChange={(e) => setStepPosition(Number(e.target.value))}
                  >
                    {Array.from({ length: tasks.length + 1 }, (_, i) => i + 1).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos === tasks.length + 1
                          ? t("modalStepPositionEnd")
                          : lang === "sl" ? `${pos}. mesto` : `Position ${pos}`}
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

      {/* ── Sub-Dialog: Attach only (Priponke) ── */}
      <Dialog open={attachOnlyOpen} onOpenChange={(open) => {
        setAttachOnlyOpen(open);
        if (!open) setAttachOnlyFile(null);
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
              const success = await uploadJobFile(attachOnlyFile);
              setAttachOnlyUploading(false);
              if (success) {
                setAttachOnlyOpen(false);
                setAttachOnlyFile(null);
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

              <div className="flex flex-col gap-3">
                <AuraFileInput
                  id="attach-only-file"
                  onFile={setAttachOnlyFile}
                />
                {attachOnlyFile && (
                  <span className="text-[11px] text-slate-500 truncate">
                    {attachOnlyFile.name}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttachOnlyOpen(false);
                    setAttachOnlyFile(null);
                  }}
                  className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {t("modalCancel")}
                </button>
                <button
                  type="submit"
                  disabled={!attachOnlyFile || attachOnlyUploading}
                  className="flex-1 h-9 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                >
                  {attachOnlyUploading ? t("modalUploading") : t("modalAdd")}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Sub-Dialog: Confirm step finished ── */}
      <Dialog open={!!confirmStepId} onOpenChange={(open) => {
        if (!open) setConfirmStepId(null);
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
            const missingAttachment = task.requiresAttachment && !task.attachment;
            return (
              <div className={auraCard}>
                <div className="flex flex-col gap-4 text-slate-800">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                      {t("modalConfirmStepTitle")}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 text-center">
                    {t("modalConfirmStepPrefix")} <strong className="text-slate-900">{task.text}</strong> {t("modalConfirmStepSuffix")}
                  </p>

                  {missingAttachment && (
                    <div className="flex flex-col gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-sm text-red-600 font-semibold text-center">
                        {t("modalConfirmStepMissingTitle")}
                      </p>
                      <p className="text-xs text-slate-500 text-center">
                        {t("modalConfirmStepMissingDesc")}
                      </p>
                      <AuraFileInput
                        id="confirm-step-attachment"
                        onFile={async (file) => {
                          setConfirmUploading(true);
                          const success = await uploadJobFile(file, task.id);
                          setConfirmUploading(false);
                          if (success) {
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, attachment: true } : t));
                          }
                        }}
                      />
                      {confirmUploading && (
                        <span className="text-[11px] text-slate-400 text-center">{t("modalUploading")}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStepId(null)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {t("modalCancel")}
                    </button>
                    <button
                      type="button"
                      disabled={missingAttachment}
                      onClick={async () => {
                        await handleToggleComplete(task);
                        setConfirmStepId(null);
                      }}
                      className="flex-1 h-10 rounded-xl bg-[#1B3A6B] hover:bg-[#142c52] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                    >
                      {t("modalConfirmStepSubmit")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Sub-Dialog: Confirm step deletion ── */}
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

      {/* ── Sub-Dialog: Attachment quick view ── */}
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
                  {previewAttachment.url ? (
                    <a
                      href={previewAttachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                    >
                      <Paperclip className="w-10 h-10 text-slate-400" />
                    </a>
                  ) : (
                    <div className="aspect-video rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Paperclip className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-800">{previewAttachment.name}</p>
                  <p className="text-xs text-slate-500">{t("modalPreviewAddedAtPrefix")} {previewAttachment.time} · {previewAttachment.date}</p>
                </div>

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
    </>
  );
}
