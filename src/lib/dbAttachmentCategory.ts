import type { AttachmentType, DocumentType } from "@/config/constants";

/** DB Priponke sub-tabs: All / Invoices / Documents / Images / Other */
export type DbAttachmentCategory = "invoice" | "document" | "image" | "other";

/**
 * Prefer saved DB fields (Mark a11): never invent category from filename alone.
 * Images → image; invoice/receipt → invoice; pdf/known docs → document;
 * unknown → other (still listed — never silently drop).
 * Audio returns null — voice lives in chat, not Priponke.
 */
export function dbAttachmentCategory(input: {
  attachment_type: string;
  document_type: string | null;
}): DbAttachmentCategory | null {
  if (input.attachment_type === "audio") return null;

  const doc = input.document_type as DocumentType | null;
  // OCR invoice/receipt wins over image mime — scan of račun → Računi (Mark).
  if (doc === "invoice" || doc === "receipt") return "invoice";
  if (doc && doc !== "other" && input.attachment_type === "image") return "document";
  if (input.attachment_type === "image") return "image";
  if (input.attachment_type === "pdf") return "document";
  if (doc && doc !== "other") return "document";

  // Unclassified → Other (visible under Ostalo), not discarded (Mark).
  return "other";
}

export function isAttachmentType(value: string): value is AttachmentType {
  return value === "image" || value === "pdf" || value === "audio" || value === "other";
}
