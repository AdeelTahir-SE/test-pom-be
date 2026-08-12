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
  // Mark: only short lines (1–2 words) are section headings — not content
  // that merely contains a heading keyword (e.g. "Naročnik Gradnje d.o.o.").
  const cleaned = line.replace(/[:\-]\s*$/, "").trim();
  if (!cleaned) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 2) return false;
  return /^(kupac|prodavatelj|dobavitelj|supplier|vendor|seller|customer|client|naro[cč]nik|stranka|adresa|podaci\s+o|invoice|delivery|parties|merchant)\b/i.test(
    cleaned
  );
}

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

/** Slovenian type names for preview line 1 (Mark — no English). */
function typeHeading(type: DocumentType): string {
  switch (type) {
    case "invoice":
      return "Račun";
    case "delivery_note":
      return "Dobavnica";
    case "contract":
      return "Pogodba";
    case "service_report":
      return "Servis";
    case "offer":
      return "Ponudba";
    case "receipt":
      return "Potrdilo";
    default:
      return "Dokument";
  }
}

function extractInvoiceNo(text: string): string | null {
  return findLabeledValue(text, [
    /broj\s+ra[cč]una/i,
    /št(?:evilka|\.?)\s*ra[cč]una/i,
    /invoice\s*(?:no\.?|number|#|nr\.?)/i,
  ]);
}

/** Mark: party synonyms only — naročnik, stranka, kupec, customer, client, kupac. */
function extractCustomer(text: string): string | null {
  return findLabeledValue(text, [
    /naro[cč]nik/i,
    /stranka/i,
    /kupec/i,
    /customer/i,
    /client/i,
    /kupac/i,
  ]);
}

function extractInvoiceDate(text: string): string | null {
  const preferred = findLabeledValue(text, [
    /datum\s+ra[cč]una/i,
    /invoice\s*date/i,
  ]);
  if (preferred) {
    const dateOnly = preferred.match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\.?)/);
    return dateOnly?.[1]?.replace(/\s+/g, " ").trim() ?? preferred;
  }
  return findLabeledValue(text, [/\bdate\b/i, /\bdatum\b/i]);
}

function extractAmount(text: string): string | null {
  // Slovenian / EN first — do not lead with Croatian "ukupan iznos eur" (Mark).
  const labeled = findLabeledValue(text, [
    /\bznesek\b/i,
    /\bvsota\b/i,
    /skupaj/i,
    /za\s+pla[cč]ilo/i,
    /amount\s*due/i,
    /\btotal\b/i,
    /\bamount\b/i,
    /ukupan\s+iznos(?:\s+eur)?/i,
  ]);
  if (labeled) {
    const withCurrency = labeled.match(
      /([0-9][0-9.\s]*,[0-9]{2}\s*(?:€|eur|kn|usd|\$)?|[0-9][0-9.\s]*\s*(?:€|eur|usd|\$))/i
    );
    return (withCurrency?.[1] ?? labeled).replace(/\s+/g, " ").trim();
  }

  const inline = stripMarkdownNoise(text).match(
    /(?:znesek|vsota|skupaj|total|amount(?:\s*due)?|ukupan\s+iznos(?:\s+eur)?)\s*[:\-]?\s*([0-9.]+,[0-9]{2}\s*€?)/i
  );
  return inline?.[1]?.trim() ?? null;
}

function extractDuration(text: string): string | null {
  return findLabeledValue(text, [/(?:duration|trajanje|veljavnost)/i]);
}

function extractWork(text: string): string | null {
  return firstNonEmpty(
    findLabeledValue(text, [
      /(?:performed\s*work|opravljeno\s*delo|work\s*done)/i,
      /opis\s+dela/i,
      /vrsta\s+dela/i,
      /zadeva/i,
      /predmet/i,
    ])
  );
}

function extractItems(text: string): string | null {
  return findLabeledValue(text, [/(?:items|postavke|št\.\s*postavk)/i]);
}

function extractForWhom(text: string): string | null {
  return extractCustomer(text);
}

function pushRaw(lines: string[], value: string | null | undefined): void {
  const v = value?.trim();
  if (v) lines.push(v);
}

/**
 * Type-specific preview lines — raw values only, no "Zadeva:" / "Datum:" labels (Mark).
 * Line 1 = Slovenian type (+ document number when available).
 */
function extractStructuredLines(type: DocumentType, text: string): string[] {
  const lines: string[] = [];
  const heading = typeHeading(type);
  const docNo = extractInvoiceNo(text);
  const date = extractInvoiceDate(text);
  const forWhom = extractForWhom(text);
  const amount = extractAmount(text);

  switch (type) {
    case "invoice":
      // Mark: Račun # / party / date / amount (date is 3rd).
      lines.push(docNo ? `${heading} ${docNo}` : heading);
      pushRaw(lines, forWhom);
      pushRaw(lines, date);
      pushRaw(lines, amount);
      break;
    case "offer":
      // Predračun / Ponudba — same party→date→amount order as Račun.
      lines.push(docNo ? `${heading} ${docNo}` : heading);
      pushRaw(lines, forWhom);
      pushRaw(lines, date);
      pushRaw(lines, amount);
      break;
    case "receipt":
      lines.push(heading);
      pushRaw(lines, date);
      pushRaw(lines, amount);
      break;
    case "delivery_note":
      lines.push(heading);
      pushRaw(lines, date);
      pushRaw(lines, forWhom);
      pushRaw(lines, extractItems(text));
      break;
    case "contract":
      lines.push(heading);
      pushRaw(lines, extractDuration(text));
      pushRaw(lines, forWhom);
      break;
    case "service_report":
      lines.push(heading);
      pushRaw(lines, extractWork(text));
      pushRaw(lines, forWhom);
      break;
    default:
      break;
  }

  return lines;
}

/** Mark: other docs → "Dokument - filename"; not OCR dump. */
function fallbackPreview(fileName: string): string {
  const name = fileName.trim() || "datoteka";
  return truncate(`Dokument - ${name}`);
}

/** Truncate by Unicode code points so Slovene letters (č/š/ž) are not split. */
function truncate(text: string): string {
  const chars = Array.from(text);
  if (chars.length <= DOCUMENT_PREVIEW_MAX_CHARS) return text;
  return `${chars.slice(0, DOCUMENT_PREVIEW_MAX_CHARS - 1).join("").trimEnd()}…`;
}

/**
 * Build a concise stored preview once after OCR.
 * Typed docs: type-specific raw lines. Other: Dokument - filename.
 */
export function buildDocumentPreview(
  documentType: DocumentType,
  ocrText: string,
  fileName: string
): string {
  const text = ocrText.trim();
  if (!text) return fallbackPreview(fileName);

  if (documentType === "other") {
    return fallbackPreview(fileName);
  }

  const structured = extractStructuredLines(documentType, text);
  if (structured.length === 0) {
    return fallbackPreview(fileName);
  }

  return truncate(structured.join("\n"));
}

/** Classify + preview in one pass for the OCR success path. */
export function enrichDocumentFromOcr(ocrText: string, fileName: string): DocumentEnrichment {
  const document_type = classifyDocument(ocrText);
  const document_preview = buildDocumentPreview(document_type, ocrText, fileName);
  return { document_type, document_preview };
}
