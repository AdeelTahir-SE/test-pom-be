// Central place for all MVP limits/constants (spec-derived). No magic numbers in code.

export const LIMITS = {
  // Files (Supabase Storage add-on §12 + Attachments §10)
  MAX_FILES_PER_REQUEST: 3,
  // Mark a13: required checklist attachments were blocked at 6; allow up to 15.
  MAX_FILES_PER_JOB: 15,
  MAX_DOCUMENT_BYTES: 25 * 1024 * 1024, // 25 MB hard cap
  MAX_IMAGE_OUTPUT_BYTES: 500 * 1024, // compressed image target
  IMAGE_MAX_DIMENSION: 1920, // 1920 x 1920

  // Messages (Internal Messages §5)
  MESSAGE_MAX_LENGTH: 400,
  OFFICE_REMINDER_DESC_MAX: 80,

  // Voice (Deepgram add-on §3). Exact duration is enforced client-side at
  // record time (the recorder UI caps at 15s); this is a generous backend
  // byte-size safety net, not a duration check.
  VOICE_MAX_SECONDS: 15,
  VOICE_MAX_BYTES: 5 * 1024 * 1024,

  // Polling (global rule)
  POLLING_INTERVAL_MS: 30_000,

  // Upload
  STORAGE_UPLOAD_TIMEOUT_MS: 30_000,
} as const;

// Allowed values for job.status (Jobs Engine §9 — fixed universal set)
export const JOB_STATUSES = [
  "pending",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// Notification types (Part 7 §23 — generic closed set)
export const NOTIFICATION_TYPES = [
  "job_assigned",
  "job_updated",
  "message_received",
  "voice_message_received",
  "urgent_message",
  "job_completed",
  "system_alert",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Message types (Communication §7 — closed set)
export const MESSAGE_TYPES = ["text", "voice", "system"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const TRANSCRIPTION_STATUSES = [
  "not_applicable",
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUSES)[number];

export const DELIVERY_JOB_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "retry",
  "failed",
  "cancelled",
] as const;
export type DeliveryJobStatus = (typeof DELIVERY_JOB_STATUSES)[number];

// File attachment types (Attachments §8)
export const ATTACHMENT_TYPES = ["image", "pdf", "audio", "other"] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

// Document Classification & Preview add-on §1 — informational only.
export const DOCUMENT_TYPES = [
  "invoice",
  "delivery_note",
  "contract",
  "service_report",
  "offer",
  "receipt",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Stored preview budget (Add-on 1 §4: approximately 300–500 characters). */
export const DOCUMENT_PREVIEW_MAX_CHARS = 500;

// User roles (Permission Matrix §12). office/secretary map to "manager" for MVP.
export const USER_ROLES = ["owner", "manager", "worker"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Office reminder action icons (Dashboard card creation spec)
export const REMINDER_ACTIONS = [
  "phone",
  "email",
  "attachment",
  "confirm",
  "reject",
  "link",
  "calendar",
  "location",
] as const;
export type ReminderAction = (typeof REMINDER_ACTIONS)[number];
