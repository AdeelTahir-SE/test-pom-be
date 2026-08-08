// Maps real backend API shapes onto the existing dashboard components' view
// models (Worker/TaskItem/Order from lib/mockData; Message from lib/types/messages).
// Keeping the presentational components unchanged and doing the translation here
// in one place avoids touching a dozen already-built, styled components.
import type { Worker, TaskItem, Order } from "@/lib/mockData";
import type { Message } from "@/lib/types/messages";
import type { TranslationKey } from "@/lib/translations";
import { formatSiDateTimeCompact } from "@/lib/officeDate";

type Translate = (key: TranslationKey) => string;

export interface ApiJob {
  id: string;
  company_seq: number;
  status: "pending" | "in_progress" | "waiting" | "completed" | "cancelled";
  title: string;
  description: string | null;
  priority: string | null;
  customer: string | null;
  location: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  worker_id: string | null;
  created_at: string;
  hidden_at?: string | null;
  hidden_by?: string | null;
}

export function jobNumber(job: Pick<ApiJob, "company_seq">): string {
  return `#${String(job.company_seq).padStart(3, "0")}`;
}

export interface ApiChecklistItem {
  id: string;
  job_id: string;
  label: string;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
  requires_attachment: boolean;
  has_attachment: boolean;
}

export interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "manager" | "worker";
  phone: string | null;
  is_active: boolean;
}

export interface ApiOfficeReminder {
  id: string;
  title: string;
  description: string | null;
  is_urgent: boolean;
  remind_on: string | null;
  /** Form-entered wall clock (HH:mm). Never derived from created_at. */
  remind_time: string | null;
  actions: string[];
  action_state: { confirmed?: boolean; rejected?: boolean };
  phone: string | null;
  link: string | null;
  order_index: number;
  hidden_at: string | null;
  created_at: string;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  job_id: string | null;
  is_read: boolean;
  hidden_at: string | null;
  created_at: string;
}

/** Checklist / message stamps: time today, date · time on other days. */
export function formatTime(iso: string | null): string {
  return formatSiDateTimeCompact(iso);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function jobStatusToWorkerStatus(status: ApiJob["status"]): Worker["status"] {
  if (status === "completed") return "koncano";
  return "v_teku";
}

export function jobToWorkerCard(
  job: ApiJob,
  checklist: ApiChecklistItem[],
  worker: ApiUser | undefined,
  t: Translate
): Worker {
  // Completed steps stay frozen above incomplete (Mark: history consistency).
  const tasks: TaskItem[] = checklist
    .slice()
    .sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? -1 : 1;
      return a.order_index - b.order_index;
    })
    .map((item) => ({
      id: item.id,
      text: item.label,
      completed: item.is_completed,
      completedAt: item.is_completed ? formatTime(item.completed_at) : undefined,
      requiresAttachment: item.requires_attachment,
      hasAttachment: item.has_attachment,
    }));

  return {
    id: job.worker_id ?? job.id,
    name: worker?.full_name ?? t("cardUnassigned"),
    avatar: worker ? initials(worker.full_name) : "?",
    role: job.customer ?? "",
    currentTask: job.title,
    location: job.location ?? "",
    status: jobStatusToWorkerStatus(job.status),
    tasks,
    phone: worker?.phone ?? "",
    email: worker?.email ?? "",
    unreadCount: 0,
  };
}

export function reminderToCard(
  r: ApiOfficeReminder,
  t: Translate
): Order & {
  hasEmail?: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  phoneNumber?: string;
  hasConfirm?: boolean;
  hasDecline?: boolean;
} {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    // Bottom big time = form-entered time (never created_at / system clock).
    time: r.remind_time?.trim() || "",
    // Top tiny time = card creation time (created_at).
    createdAt: r.created_at,
    priority: r.is_urgent ? "nujno" : "normalna",
    status: r.action_state?.confirmed
      ? "potrjeno"
      : r.action_state?.rejected
        ? "zavrnjeno"
        : "caka_potrditev",
    workerId: "",
    workerName: t("cardSenderOffice"),
    hasEmail: r.actions.includes("email"),
    hasAttachment: r.actions.includes("attachment"),
    attachmentName: (() => {
      if (!r.link) return "";
      try {
        const linkData = JSON.parse(r.link);
        return linkData.fileName || "";
      } catch {
        return "";
      }
    })(),
    phoneNumber: r.phone ?? "",
    hasConfirm: r.actions.includes("confirm"),
    hasDecline: r.actions.includes("reject"),
  };
}

// message_received notifications don't store a sender name directly — the
// sender is always the assigned worker on the associated job (Internal
// Messages §13's strict vertical Employee<->Office rule guarantees this when
// the recipient is office/manager), so we resolve it via the job lookup.
export function notificationToMessage(
  n: ApiNotification,
  jobById: Map<string, ApiJob>,
  workerById: Map<string, ApiUser>,
  t: Translate
): Message {
  const job = n.job_id ? jobById.get(n.job_id) : undefined;
  const worker = job?.worker_id ? workerById.get(job.worker_id) : undefined;

  return {
    id: n.id,
    workerId: job?.worker_id ?? "",
    workerName: worker?.full_name ?? t("cardUnknownSender"),
    text: n.body ?? n.title,
    time: formatTime(n.created_at),
    // notifyUser() titles this "New voice message" specifically for voice
    // messages (see /api/jobs/[id]/voice-message) — the only signal here to
    // tell voice and text notifications apart.
    type: n.title.toLowerCase().includes("voice") ? "glasovno" : "tekst",
    targetTask: job?.title,
  };
}

/** Shared office KOMUNIKACIJA feed row → card model (a6).
 * Header = sender + time; inner title = job name (Mark). */
export function communicationToMessage(
  m: {
    id: string;
    content: string;
    message_type: string;
    created_at: string;
    sender_id: string;
    job_title: string | null;
    worker_id: string | null;
    worker_name: string | null;
    sender_name?: string | null;
    recipient_name?: string | null;
  },
  t: Translate
): Message {
  const sender = m.sender_name?.trim() || t("cardUnknownSender");

  return {
    id: m.id,
    workerId: m.worker_id ?? "",
    // OfficeCard header uses workerName → sender (Mark).
    workerName: sender,
    text: m.content,
    time: formatTime(m.created_at),
    type: m.message_type === "voice" ? "glasovno" : "tekst",
    // Inner bold title = job name on the TEREN card (Mark).
    targetTask: m.job_title?.trim() || undefined,
  };
}
