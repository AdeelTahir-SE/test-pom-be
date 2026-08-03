import { LIMITS } from "@/config/constants";

/** Keep in sync with `classifyUpload` (backend). */
export const JOB_ATTACHMENT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
  "doc",
  "docx",
  "txt",
] as const;

/** `<input accept>` hint — still validate in JS. */
export const JOB_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,image/jpeg,image/png,.pdf,application/pdf,.doc,.docx,.txt,text/plain";

export type JobAttachmentValidationError = "file_too_large" | "file_type_unsupported";

export type JobAttachmentValidationResult =
  | { ok: true }
  | { ok: false; error: JobAttachmentValidationError };

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

/** Client-side UX gate only — server still re-validates. */
export function validateJobAttachmentFile(file: File): JobAttachmentValidationResult {
  if (file.size > LIMITS.MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  const ext = extensionOf(file.name);
  if (!(JOB_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "file_type_unsupported" };
  }

  return { ok: true };
}

export function jobAttachmentErrorMessage(
  error: JobAttachmentValidationError,
  t: (key: "fileTooLarge" | "fileTypeUnsupported") => string
): string {
  return error === "file_too_large" ? t("fileTooLarge") : t("fileTypeUnsupported");
}
