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

function extractStructuredLines(type: DocumentType, text: string): string[] {
  const lines: string[] = [typeHeading(type)];

  const supplier = extractSupplier(text);
  const customer = extractCustomer(text);
  const invoiceNo = extractInvoiceNo(text);
  const date = extractInvoiceDate(text);
  const amount = extractAmount(text);
  const items = findLabeledValue(text, [/(?:items|postavke|št\.\s*postavk)/i]);
  const parties = findLabeledValue(text, [/(?:parties|stranke|pogodbene\s*stranke)/i]);
  const duration = findLabeledValue(text, [/(?:duration|trajanje)/i]);
  const work = findLabeledValue(text, [
    /(?:performed\s*work|opravljeno\s*delo|work\s*done)/i,
  ]);
  const technician = findLabeledValue(text, [/(?:technician|tehnik)/i]);

  switch (type) {
    case "invoice":
      if (supplier) lines.push(`Supplier: ${supplier}`);
      if (invoiceNo) lines.push(`Invoice No: ${invoiceNo}`);
      if (date) lines.push(`Date: ${date}`);
      if (amount) lines.push(`Amount: ${amount}`);
      break;
    case "delivery_note":
      if (supplier) lines.push(`Supplier: ${supplier}`);
      if (date) lines.push(`Delivery: ${date}`);
      if (items) lines.push(`Items: ${items}`);
      break;
    case "contract":
      if (parties) lines.push(`Parties: ${parties}`);
      else if (supplier && customer) lines.push(`Parties: ${supplier} / ${customer}`);
      if (duration) lines.push(`Duration: ${duration}`);
      break;
    case "service_report":
      if (customer) lines.push(`Customer: ${customer}`);
      if (work) lines.push(`Performed work: ${work}`);
      if (technician) lines.push(`Technician: ${technician}`);
      break;
    case "offer":
      if (supplier) lines.push(`From: ${supplier}`);
      if (customer) lines.push(`To: ${customer}`);
      if (date) lines.push(`Date: ${date}`);
      if (amount) lines.push(`Amount: ${amount}`);
      break;
    case "receipt":
      if (supplier) lines.push(`Merchant: ${supplier}`);
      if (date) lines.push(`Date: ${date}`);
      if (amount) lines.push(`Amount: ${amount}`);
      break;
    default:
      break;
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
  // Heading alone is not enough — need at least one extracted field.
  if (structured.length <= 1) {
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
