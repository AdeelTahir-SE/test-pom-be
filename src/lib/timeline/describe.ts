import type { TranslationKey } from "@/lib/translations";
import type { JobStatus } from "@/config/constants";
import { isDocumentType, type DocumentType } from "@/lib/documents/classify";

export interface TimelineEventLike {
  event_type: string;
  metadata: Record<string, unknown> | null;
}

const STATUS_LABEL_KEY: Record<JobStatus, TranslationKey> = {
  pending: "jobStatusPending",
  in_progress: "jobStatusInProgress",
  waiting: "jobStatusWaiting",
  completed: "jobStatusCompleted",
  cancelled: "jobStatusCancelled",
};

const DOCUMENT_TYPE_LABEL_KEY: Record<DocumentType, TranslationKey> = {
  invoice: "documentTypeInvoice",
  delivery_note: "documentTypeDeliveryNote",
  contract: "documentTypeContract",
  service_report: "documentTypeServiceReport",
  offer: "documentTypeOffer",
  receipt: "documentTypeReceipt",
  other: "documentTypeOther",
};

export function documentTypeLabel(
  type: unknown,
  t: (key: TranslationKey) => string
): string | null {
  if (!isDocumentType(type)) return null;
  return t(DOCUMENT_TYPE_LABEL_KEY[type]);
}

function snippet(text: unknown, max = 40): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const trimmed = text.trim();
  return trimmed.length > max ? `"${trimmed.slice(0, max)}…"` : `"${trimmed}"`;
}

/** Prefer metadata.job_seq, else the card number from the open details screen. */
export function formatCardId(
  meta: Record<string, unknown>,
  fallbackCardId?: string | null
): string | null {
  if (typeof meta.job_seq === "number" && Number.isFinite(meta.job_seq)) {
    return `#${String(meta.job_seq).padStart(3, "0")}`;
  }
  if (typeof fallbackCardId === "string" && fallbackCardId.trim()) {
    return fallbackCardId.trim().startsWith("#")
      ? fallbackCardId.trim()
      : `#${fallbackCardId.trim()}`;
  }
  return null;
}

/**
 * Human-readable timeline line. Mark's rule: prefer findable card #IDs over
 * vague phrases like "worker assigned" / "attachment added".
 */
export function describeTimelineEvent(
  e: TimelineEventLike,
  t: (key: TranslationKey) => string,
  fallbackCardId?: string | null
): string {
  const meta = e.metadata ?? {};
  const card = formatCardId(meta, fallbackCardId);

  switch (e.event_type) {
    case "job_created": {
      const title = typeof meta.title === "string" ? meta.title : "";
      return card
        ? `${t("timelineJobCreated")}: ${card}${title ? ` · ${title}` : ""}`
        : `${t("timelineJobCreated")}: ${title}`;
    }
    case "worker_assigned":
      // Prefer card #ID (useful later) over bare "worker assigned".
      return card
        ? `${t("timelineCard")}: ${card}`
        : typeof meta.worker_name === "string" && meta.worker_name
          ? `${t("timelineWorkerAssigned")}: ${meta.worker_name}`
          : t("timelineWorkerAssigned");
    case "job_updated":
      if (meta.hidden === true) {
        return card
          ? `${t("timelineJobHidden")}: ${card}`
          : t("timelineJobHidden");
      }
      return card ? `${t("timelineJobUpdated")}: ${card}` : t("timelineJobUpdated");
    case "status_changed":
      if (meta.to && typeof meta.to === "string" && meta.to in STATUS_LABEL_KEY) {
        const status = t(STATUS_LABEL_KEY[meta.to as JobStatus]);
        return card
          ? `${t("timelineStatusChanged")}: ${card} · ${status}`
          : `${t("timelineStatusChanged")}: ${status}`;
      }
      return card ? `${t("timelineStatusChanged")}: ${card}` : t("timelineStatusChanged");
    case "job_completed":
      return card ? `${t("timelineJobCompleted")}: ${card}` : t("timelineJobCompleted");
    case "checklist_completed": {
      const label = typeof meta.label === "string" ? meta.label : "";
      return card
        ? `${t("timelineChecklistCompleted")}: ${card} · ${label}`
        : `${t("timelineChecklistCompleted")}: ${label}`;
    }
    case "image_uploaded":
    case "document_uploaded": {
      const name = typeof meta.file_name === "string" ? meta.file_name : "";
      const prefix =
        e.event_type === "image_uploaded"
          ? t("timelineImageUploaded")
          : t("timelineDocumentUploaded");
      return card ? `${prefix}: ${card} · ${name}` : `${prefix}: ${name}`;
    }
    case "file_hidden": {
      const name = typeof meta.file_name === "string" ? meta.file_name : "";
      return card
        ? `${t("timelineFileHidden")}: ${card} · ${name}`
        : `${t("timelineFileHidden")}: ${name}`;
    }
    case "ocr_completed": {
      // Add-on 1: prefer "📄 Invoice · file.pdf" over bare "OCR completed".
      const docLabel = documentTypeLabel(meta.document_type, t);
      const fileName = typeof meta.file_name === "string" ? meta.file_name : "";
      if (docLabel) {
        const head = `📄 ${docLabel}`;
        if (fileName) return card ? `${head}: ${card} · ${fileName}` : `${head} · ${fileName}`;
        return card ? `${head}: ${card}` : head;
      }
      return card ? `${t("timelineOcrCompleted")}: ${card}` : t("timelineOcrCompleted");
    }
    case "voice_message_transcribed": {
      const base = meta.transcribed ? t("timelineVoiceTranscribed") : t("timelineVoiceReceived");
      const s = snippet(meta.content);
      const withCard = card ? `${base}: ${card}` : base;
      return s ? `${withCard} · ${s}` : withCard;
    }
    case "message_sent": {
      const s = snippet(meta.content);
      const base = card
        ? `${t("timelineMessageSent")}: ${card}`
        : t("timelineMessageSent");
      return s ? `${base} · ${s}` : base;
    }
    case "notification_deleted":
      return card
        ? `${t("timelineNotificationDeleted")}: ${card}`
        : t("timelineNotificationDeleted");
    default:
      return e.event_type.replace(/_/g, " ");
  }
}
