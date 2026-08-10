import { DOCUMENT_PREVIEW_MAX_CHARS, type DocumentType } from "@/config/constants";
import { classifyDocument } from "./classify";

export interface DocumentEnrichment {
  document_type: DocumentType;
  document_preview: string;
}

function firstNonEmpty(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    if (c && c.trim()) return c.trim();
  }
  return null;
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\*\*/g, "")
    .replace(/\r/g, "");
}

function cleanLine(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^\|+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  if (!line) return true;
  if (/^---+/.test(line)) return true;
  if (/^stranica\s+\d+/i.test(line)) return true;
  if (/^page\s+\d+/i.test(line)) return true;
  if (/^©/.test(line)) return true;
  return false;
}

function isSectionHeading(line: string): boolean {
  return /^(kupac|prodavatelj|dobavitelj|supplier|vendor|seller|customer|client|naro[cč]nik|stranka|adresa|podaci\s+o|invoice|delivery|parties|merchant)\b/i.test(
    line.replace(/[:\-]\s*$/, "")
  );
}

/** Value looks like a page marker / garbage, not a field. */
function isNoiseValue(value: string): boolean {
  if (/^(stranica|page)\b/i.test(value)) return true;
  if (/^\d+\s+od\s+\d+$/i.test(value)) return true;
  if (/^\d+\s+of\s+\d+$/i.test(value)) return true;
  return false;
}

/**
 * Find a labeled field in OCR text.
 * Supports:
 * - "Label: value" on one line
 * - "## Label:" then value on the next non-empty line(s)
 */
function findLabeledValue(text: string, labels: RegExp[]): string | null {
  const lines = stripMarkdownNoise(text).split(/\n/).map(cleanLine);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || isNoiseLine(line)) continue;

    for (const label of labels) {
      const sameLine = line.match(
        new RegExp(`^(?:#{0,3}\\s*)?${label.source}\\s*[:\\-]\\s*(.+)$`, "i")
      );
      if (sameLine?.[1]) {
        const value = sameLine[1].trim();
        if (value && !isNoiseValue(value) && !isSectionHeading(value)) {
          return value;
        }
      }

      // Heading-only label → take next meaningful line.
      const headingOnly = new RegExp(`^(?:#{0,3}\\s*)?${label.source}\\s*[:\\-]?\\s*$`, "i");
      if (headingOnly.test(line)) {
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          const next = lines[j];
          if (!next || isNoiseLine(next)) continue;
          if (isSectionHeading(next)) break;
          if (isNoiseValue(next)) continue;
          return next;
        }
      }
    }
  }

  return null;
}

function typeHeading(type: DocumentType): string {
  switch (type) {
    case "invoice":
      return "Invoice";
    case "delivery_note":
      return "Delivery Note";
    case "contract":
      return "Contract";
    case "service_report":
      return "Service Report";
    case "offer":
      return "Offer / Quotation";
    case "receipt":
      return "Receipt";
    default:
      return "Document";
  }
}

function extractInvoiceNo(text: string): string | null {
  // Prefer explicit invoice-number labels — never bare "Račun" (that ate "Stranica").
  return findLabeledValue(text, [
    /broj\s+ra[cč]una/i,
    /št(?:evilka|\.?)\s*ra[cč]una/i,
    /invoice\s*(?:no\.?|number|#|nr\.?)/i,
  ]);
}

function extractSupplier(text: string): string | null {
  return findLabeledValue(text, [
    /prodavatelj/i,
    /dobavitelj/i,
    /supplier/i,
    /vendor/i,
    /seller/i,
    /from/i,
  ]);
}

function extractCustomer(text: string): string | null {
  return findLabeledValue(text, [
    /kupac/i,
    /customer/i,
    /client/i,
    /naro[cč]nik/i,
    /stranka/i,
  ]);
}

function extractInvoiceDate(text: string): string | null {
  // Prefer invoice date over order date.
  const preferred = findLabeledValue(text, [
    /datum\s+ra[cč]una/i,
    /invoice\s*date/i,
  ]);
  if (preferred) {
    // Keep date portion if time is appended: "1. 9. 2023. 23:11:17"
    const dateOnly = preferred.match(
      /(\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\.?)/
    );
    return dateOnly?.[1]?.replace(/\s+/g, " ").trim() ?? preferred;
  }
  return findLabeledValue(text, [/\bdate\b/i, /\bdatum\b/i]);
}

function extractAmount(text: string): string | null {
  const labeled = findLabeledValue(text, [
    /ukupan\s+iznos\s+eur/i,
    /ukupan\s+iznos/i,
    /amount\s*due/i,
    /\btotal\b/i,
    /\bamount\b/i,
    /\bznesek\b/i,
    /\bvsota\b/i,
  ]);
  if (labeled) {
    const withCurrency = labeled.match(
      /([0-9][0-9.\s]*,[0-9]{2}\s*(?:€|eur|kn|usd|\$)?|[0-9][0-9.\s]*\s*(?:€|eur|usd|\$))/i
    );
    return (withCurrency?.[1] ?? labeled).replace(/\s+/g, " ").trim();
  }

  // Fallback: bold total line often rendered as "Ukupan iznos EUR: 1.160,34 €"
  const inline = stripMarkdownNoise(text).match(
    /ukupan\s+iznos\s+eur\s*[:\-]?\s*([0-9.]+,[0-9]{2}\s*€?)/i
  );
  return inline?.[1]?.trim() ?? null;
}

function extractSubject(text: string): string | null {
  return findLabeledValue(text, [
    /zadeva/i,
    /predmet/i,
    /subject/i,
    /regarding/i,
    /opis\s+dela/i,
    /vrsta\s+dela/i,
  ]);
}

function extractForWhom(text: string): string | null {
  // Prefer the party the document is FOR — never the sender/supplier.
  return firstNonEmpty(
    extractCustomer(text),
    findLabeledValue(text, [
      /za\b/i,
      /for\b/i,
      /bill\s*to/i,
      /naslovnik/i,
      /prejemnik/i,
    ])
  );
}

/**
 * Mark a13: AI Extract must be three useful lines —
 * Subject (Zadeva), Date, For whom — not sender/supplier noise.
 */
function extractStructuredLines(type: DocumentType, text: string): string[] {
  const lines: string[] = [];

  const subject =
    extractSubject(text) ??
    (type !== "other" ? typeHeading(type) : null);
  const date = extractInvoiceDate(text);
  const forWhom = extractForWhom(text);

  if (subject) lines.push(`Zadeva: ${subject}`);
  if (date) lines.push(`Datum: ${date}`);
  if (forWhom) lines.push(`Za: ${forWhom}`);

  // If structured trio is empty, keep a light type-specific fallback so
  // invoices still show something useful beyond filename.
  if (lines.length === 0) {
    const invoiceNo = extractInvoiceNo(text);
    const amount = extractAmount(text);
    if (invoiceNo) lines.push(`Št.: ${invoiceNo}`);
    if (amount) lines.push(`Znesek: ${amount}`);
  }

  return lines;
}

function fallbackPreview(fileName: string, ocrText: string): string {
  const firstLines = stripMarkdownNoise(ocrText)
    .split(/\n/)
    .map(cleanLine)
    .filter((l) => l && !isNoiseLine(l) && !/^!\["/.test(l))
    .slice(0, 4)
    .join("\n");
  const body = firstNonEmpty(firstLines, ocrText.slice(0, 200)) ?? "";
  const combined = fileName ? `${fileName}\n${body}` : body;
  return truncate(combined.trim());
}

function truncate(text: string): string {
  if (text.length <= DOCUMENT_PREVIEW_MAX_CHARS) return text;
  return `${text.slice(0, DOCUMENT_PREVIEW_MAX_CHARS - 1).trimEnd()}…`;
}

/**
 * Build a concise stored preview once after OCR (Add-on 1 §4–§5).
 * Prefer structured fields; always fall back to filename + first OCR lines.
 */
export function buildDocumentPreview(
  documentType: DocumentType,
  ocrText: string,
  fileName: string
): string {
  const text = ocrText.trim();
  if (!text) return truncate(fileName || "Document");

  if (documentType === "other") {
    return fallbackPreview(fileName, text);
  }

  const structured = extractStructuredLines(documentType, text);
  // Need at least one extracted field.
  if (structured.length === 0) {
    return fallbackPreview(fileName, text);
  }

  // Keep filename secondary under the structured block (Add-on 1 §3).
  if (fileName) structured.push(fileName);
  return truncate(structured.join("\n"));
}

/** Classify + preview in one pass for the OCR success path. */
export function enrichDocumentFromOcr(ocrText: string, fileName: string): DocumentEnrichment {
  const document_type = classifyDocument(ocrText);
  const document_preview = buildDocumentPreview(document_type, ocrText, fileName);
  return { document_type, document_preview };
}
