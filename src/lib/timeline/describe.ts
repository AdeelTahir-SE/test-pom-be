import type { TranslationKey } from "@/lib/translations";
import type { JobStatus } from "@/config/constants";
import { isDocumentType, type DocumentType } from "@/lib/documents/classify";
import { formatSiDateFromDayKey } from "@/lib/officeDate";

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
  if (type === "other") return null; // never show generic "Dokument" as a type badge
  return t(DOCUMENT_TYPE_LABEL_KEY[type]);
}

/** Priponke / preview title: real doc types, else Slika/PDF/filename — never fake "Dokument". */
export function attachmentDisplayTitle(
  input: {
    fileName: string;
    attachmentType?: string | null;
    documentType?: string | null;
  },
  t: (key: TranslationKey) => string
): { title: string; showFileNameSub: boolean } {
  const typed = documentTypeLabel(input.documentType, t);
  if (typed) {
    return { title: `📄 ${typed}`, showFileNameSub: true };
  }
  if (input.attachmentType === "image") {
    return { title: t("documentTypeImage"), showFileNameSub: true };
  }
  if (input.attachmentType === "pdf") {
    return { title: t("documentTypePdf"), showFileNameSub: true };
  }
  return { title: input.fileName, showFileNameSub: false };
}

/** Hide weak OCR timeline rows that Mark saw as duplicate "Dokument" for photos. */
export function shouldShowTimelineEvent(e: TimelineEventLike): boolean {
  if (e.event_type !== "ocr_completed") return true;
  const meta = e.metadata ?? {};
  const docType = meta.document_type;
  if (!docType || docType === "other") return false;
  return isDocumentType(docType);
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
      const createdOn =
        typeof meta.created_on === "string" ? formatSiDateFromDayKey(meta.created_on) : "";
      const worker =
        typeof meta.worker_name === "string" && meta.worker_name ? meta.worker_name : "";
      const createdBy =
        typeof meta.created_by_name === "string" && meta.created_by_name.trim()
          ? meta.created_by_name.trim()
          : "";
      const parts = [
        card,
        title || null,
        createdOn || null,
        worker || null,
        createdBy ? `${t("timelineJobCreatedBy")} ${createdBy}` : null,
      ].filter((p): p is string => Boolean(p));
      return parts.length > 0
        ? `${t("timelineJobCreated")}: ${parts.join(" · ")}`
        : t("timelineJobCreated");
    }
    case "worker_assigned":
      // Later reassignment — always show who was assigned (not bare card #).
      return typeof meta.worker_name === "string" && meta.worker_name
        ? `${t("timelineWorkerAssigned")}: ${meta.worker_name}`
        : t("timelineWorkerAssigned");
    case "job_updated":
      if (meta.kind === "customer_note") {
        const sender =
          typeof meta.sender_name === "string" && meta.sender_name.trim()
            ? meta.sender_name.trim()
            : "";
        const s = snippet(meta.content, 400);
        const base = t("timelineCustomerNote");
        const withSender = sender ? `${base} · ${sender}` : base;
        return s ? `${withSender} · ${s}` : withSender;
      }
      if (meta.hidden === true) {
        return card
          ? `${t("timelineJobHidden")}: ${card}`
          : t("timelineJobHidden");
      }
      return t("timelineJobUpdated");
    case "status_changed":
      if (meta.to && typeof meta.to === "string" && meta.to in STATUS_LABEL_KEY) {
        const status = t(STATUS_LABEL_KEY[meta.to as JobStatus]);
        return `${t("timelineStatusChanged")}: ${status}`;
      }
      return t("timelineStatusChanged");
    case "job_completed":
      return t("timelineJobCompleted");
    case "checklist_completed": {
      const label = typeof meta.label === "string" ? meta.label : "";
      return `${t("timelineChecklistCompleted")}: ${label}`;
    }
    case "image_uploaded":
    case "document_uploaded": {
      const name = typeof meta.file_name === "string" ? meta.file_name : "";
      const prefix =
        e.event_type === "image_uploaded"
          ? t("timelineImageUploaded")
          : t("timelineDocumentUploaded");
      return `${prefix}: ${name}`;
    }
    case "file_hidden": {
      const name = typeof meta.file_name === "string" ? meta.file_name : "";
      return `${t("timelineFileHidden")}: ${name}`;
    }
    case "ocr_completed": {
      // Add-on 1: prefer "📄 Invoice · file.pdf" over bare "OCR completed".
      const docLabel = documentTypeLabel(meta.document_type, t);
      const fileName = typeof meta.file_name === "string" ? meta.file_name : "";
      if (docLabel) {
        const head = `📄 ${docLabel}`;
        return fileName ? `${head} · ${fileName}` : head;
      }
      return t("timelineOcrCompleted");
    }
    case "voice_message_transcribed": {
      const base = meta.transcribed ? t("timelineVoiceTranscribed") : t("timelineVoiceReceived");
      const sender =
        typeof meta.sender_name === "string" && meta.sender_name.trim()
          ? meta.sender_name.trim()
          : "";
      // Full message body (Mark: time + who + full text) — only truncate huge blobs.
      const s = snippet(meta.content, 400);
      const withCard = card ? `${base}: ${card}` : base;
      const withSender = sender ? `${withCard} · ${sender}` : withCard;
      return s ? `${withSender} · ${s}` : withSender;
    }
    case "message_sent": {
      const sender =
        typeof meta.sender_name === "string" && meta.sender_name.trim()
          ? meta.sender_name.trim()
          : "";
      const s = snippet(meta.content, 400);
      const base = card
        ? `${t("timelineMessageSent")}: ${card}`
        : t("timelineMessageSent");
      const withSender = sender ? `${base} · ${sender}` : base;
      return s ? `${withSender} · ${s}` : withSender;
    }
    case "notification_deleted":
      return t("timelineNotificationDeleted");
    default:
      return e.event_type.replaceAll("_", " ");
  }
}
