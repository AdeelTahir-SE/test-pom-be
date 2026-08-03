import type { AttachmentType, DocumentType } from "@/config/constants";

/** DB Priponke sub-tabs: All / Invoices / Documents / Images */
export type DbAttachmentCategory = "invoice" | "document" | "image";

/**
 * Prefer saved DB fields (Mark a11): never invent category from filename alone.
 * Images → image; invoice/receipt document_type → invoice; everything else → document.
 * Audio is omitted from the Priponke list (voice lives in chat).
 */
export function dbAttachmentCategory(input: {
  attachment_type: string;
  document_type: string | null;
}): DbAttachmentCategory | null {
  if (input.attachment_type === "audio") return null;
  if (input.attachment_type === "image") return "image";
  const doc = input.document_type as DocumentType | null;
  if (doc === "invoice" || doc === "receipt") return "invoice";
  return "document";
}

export function isAttachmentType(value: string): value is AttachmentType {
  return value === "image" || value === "pdf" || value === "audio" || value === "other";
}
