import { DOCUMENT_PREVIEW_MAX_CHARS, type AttachmentType, type DocumentType } from "@/config/constants";
import { classifyDocument } from "./classify";
import { normalizeDocumentDate } from "./date";
import { extractDocumentFieldsWithLlm, type ExtractedDocumentFields } from "./llmExtract";

export interface DocumentEnrichment {
  document_type: DocumentType;
  document_preview: string;
  should_store_ocr_text: boolean;
}

export interface DocumentPreviewOptions {
  attachmentType?: AttachmentType | null;
}

export type RegexDocumentFields = ExtractedDocumentFields;

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
  const cleaned = line.replace(/[:\-]\s*$/, "").trim();
  if (!cleaned) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 2) return false;
  return /^(kupac|prodavatelj|dobavitelj|supplier|vendor|seller|customer|client|naro[cč]nik|stranka|adresa|podaci\s+o|invoice|delivery|parties|merchant|datum|date|znesek|amount)\b/i.test(
    cleaned
  );
}

function isNoiseValue(value: string): boolean {
  if (/^(stranica|page)\b/i.test(value)) return true;
  if (/^\d+\s+od\s+\d+$/i.test(value)) return true;
  if (/^\d+\s+of\s+\d+$/i.test(value)) return true;
  return false;
}

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

function typeHeading(type: DocumentType): string {
  switch (type) {
    case "invoice":
    case "receipt":
      return "Račun";
    case "delivery_note":
      return "Dobavnica";
    case "contract":
      return "Pogodba";
    case "service_report":
      return "Servis";
    case "offer":
      return "Ponudba";
    default:
      return "Dokument";
  }
}

function extractDocumentNo(text: string): string | null {
  for (const line of stripMarkdownNoise(text).split(/\n/).map(cleanLine)) {
    const direct = line.match(/\bra[cč]un[ \t]*(?:št\.?|st\.?|številka|stevilka|no\.?|nr\.?)[ \t]*[:#-]?[ \t]*([A-Za-z0-9][A-Za-z0-9/._-]*)/i);
    if (direct?.[1]) return direct[1].trim();
  }

  return findLabeledValue(text, [
    /broj\s+ra[cč]una/i,
    /št(?:evilka|\.?)\s*ra[cč]una/i,
    /ra[cč]un\s*(?:št\.?|st\.?|številka|stevilka|nr\.?)/i,
    /invoice\s*(?:no\.?|number|#|nr\.?)/i,
    /(?:številka|št\.?)\s*(?:dokumenta|ponudbe|pogodbe|dobavnice|naloga)/i,
    /(?:offer|quote|quotation|contract|delivery\s*note|service\s*report)\s*(?:no\.?|number|#|nr\.?)/i,
    /(?:angebot|offerte|offerta|preventivo|vertrag|lieferschein)\s*(?:nr\.?|nummer)?/i,
  ]);
}

function extractCustomer(text: string): string | null {
  const labeled = findLabeledValue(text, [
    /naro[cč]nik/i,
    /stranka/i,
    /kupec/i,
    /prejemnik/i,
    /pla[cč]nik/i,
    /customer/i,
    /client/i,
    /buyer/i,
    /bill\s*to/i,
    /kunde/i,
    /cliente/i,
    /destinatario/i,
    /kupac/i,
  ]);
  if (labeled) return labeled;

  const lines = stripMarkdownNoise(text).split(/\n/).map(cleanLine).filter((line) => line && !isNoiseLine(line));
  const companyLines = lines.filter((line) => /\b(?:d\.?\s*o\.?\s*o\.?|s\.?\s*p\.?|d\.?\s*d\.?|doo|gmbh|srl|ltd|llc)\b/i.test(line));
  return companyLines.length >= 2 ? companyLines[1]!.trim() : null;
}

function extractDate(text: string): string | null {
  const preferred = findLabeledValue(text, [
    /izdano/i,
    /datum\s+ra[cč]una/i,
    /datum\s+(?:dokumenta|ponudbe|pogodbe|dobavnice|naloga)/i,
    /date\s+of\s+issue/i,
    /issue\s+date/i,
    /invoice\s*date/i,
    /\bdate\b/i,
    /\bdatum\b/i,
  ]);
  if (preferred) return normalizeDocumentDate(preferred, text);

  const inline = stripMarkdownNoise(text).match(/\b(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}\.?|\d{4}-\d{1,2}-\d{1,2})\b/);
  return normalizeDocumentDate(inline?.[1], text);
}

function extractAmount(text: string): string | null {
  const labeled = findLabeledValue(text, [
    /\bznesek\b/i,
    /znesek\s+za\s+pla[cč]ilo/i,
    /\bvsota\b/i,
    /skupaj/i,
    /za\s+pla[cč]ilo/i,
    /skupaj\s+za\s+pla[cč]ilo/i,
    /amount\s*due/i,
    /grand\s*total/i,
    /\btotal\b/i,
    /\bamount\b/i,
    /totale(?:\s+documento)?/i,
    /gesamtbetrag/i,
    /ukupan\s+iznos(?:\s+eur)?/i,
  ]);
  if (labeled) {
    const withCurrency = labeled.match(
      /([0-9][0-9.\s]*,[0-9]{2}\s*(?:€|eur|kn|usd|\$)?|[0-9][0-9.\s]*\s*(?:€|eur|usd|\$))/i
    );
    return (withCurrency?.[1] ?? labeled).replace(/\s+/g, " ").trim();
  }

  const inline = stripMarkdownNoise(text).match(
    /(?:znesek\s+za\s+pla[cč]ilo|znesek|vsota|skupaj(?:\s+za\s+pla[cč]ilo)?|grand\s*total|total|amount(?:\s*due)?|ukupan\s+iznos(?:\s+eur)?|totale(?:\s+documento)?|gesamtbetrag)\s*[:|\-]?\s*(?:\|\s*)?([0-9][0-9.\s]*,[0-9]{2}\s*(?:€|eur)?)/i
  );
  return inline?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function pushRaw(lines: string[], value: string | null | undefined): void {
  const v = value?.trim();
  if (v) lines.push(v);
}

function extractStructuredLines(type: DocumentType, text: string): string[] {
  const heading = typeHeading(type);
  const docNo = extractDocumentNo(text);
  const lines = [docNo ? `${heading} ${docNo}` : heading];
  pushRaw(lines, extractCustomer(text));
  pushRaw(lines, extractDate(text));
  pushRaw(lines, extractAmount(text));
  return lines;
}

function cleanOptional(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

export function extractDocumentFieldsWithRegex(
  text: string,
  _fileName = "",
  source: "regex" | "llm" = "regex"
): RegexDocumentFields {
  const document_type = classifyDocument(text) as Exclude<DocumentType, "receipt">;
  const normalizedDate = normalizeDocumentDate(extractDate(text), text);
  return {
    document_type,
    document_number: cleanOptional(extractDocumentNo(text)),
    customer_name: cleanOptional(extractCustomer(text)),
    date: normalizedDate,
    amount: cleanOptional(extractAmount(text)),
    title: document_type === "other" ? cleanOptional(extractOtherTitle(text)) : null,
    source,
  };
}

function isUsefulFields(fields: ExtractedDocumentFields): boolean {
  if (fields.document_type === "other") return !!fields.title || !!fields.date;
  return !!fields.document_number || !!fields.customer_name || !!fields.date || !!fields.amount;
}

export function buildDocumentPreviewFromFields(fields: ExtractedDocumentFields, fileName: string): string {
  if (fields.document_type === "other") {
    const lines = [fallbackPreview(fileName)];
    pushRaw(lines, fields.title);
    pushRaw(lines, fields.date);
    return truncate(lines.join("\n"));
  }

  const heading = typeHeading(fields.document_type);
  const lines = [fields.document_number ? `${heading} ${fields.document_number}` : heading];
  pushRaw(lines, fields.customer_name);
  pushRaw(lines, fields.date);
  pushRaw(lines, fields.amount);
  if (lines.length <= 1) return fallbackPreview(fileName, fields.document_type);
  return truncate(lines.join("\n"));
}

function fallbackPreview(fileName: string, type: DocumentType = "other"): string {
  const name = fileName.trim() || "datoteka";
  return truncate(`${typeHeading(type)} · ${name}`);
}

function extractOtherTitle(text: string): string | null {
  const markdownLines = text.replace(/\r/g, "").split(/\n/);
  for (const raw of markdownLines) {
    const heading = raw.match(/^\s*#{1,3}\s+(.+?)\s*#*\s*$/);
    const bold = raw.match(/^\s*\*\*(.+?)\*\*\s*$/);
    const value = heading?.[1] ?? bold?.[1];
    if (!value) continue;
    const cleaned = cleanLine(value);
    if (!cleaned || isNoiseLine(cleaned)) continue;
    if (cleaned.length > 80) continue;
    return cleaned;
  }
  return null;
}

function buildOtherPreview(text: string, fileName: string): string {
  const lines = [fallbackPreview(fileName)];
  pushRaw(lines, extractOtherTitle(text));
  pushRaw(lines, extractDate(text));
  return truncate(lines.join("\n"));
}

function truncate(text: string): string {
  const chars = Array.from(text);
  if (chars.length <= DOCUMENT_PREVIEW_MAX_CHARS) return text;
  return `${chars.slice(0, DOCUMENT_PREVIEW_MAX_CHARS - 1).join("").trimEnd()}…`;
}

export function buildDocumentPreview(
  documentType: DocumentType,
  ocrText: string,
  fileName: string,
  _options: DocumentPreviewOptions = {}
): string {
  const text = ocrText.trim();
  if (!text) return fallbackPreview(fileName, documentType);

  if (documentType === "other") {
    return buildOtherPreview(text, fileName);
  }

  return buildDocumentPreviewFromFields(
    {
      ...extractDocumentFieldsWithRegex(text, fileName),
      document_type: documentType as Exclude<DocumentType, "receipt">,
    },
    fileName
  );
}

export function enrichDocumentFromOcr(
  ocrText: string,
  fileName: string,
  options: DocumentPreviewOptions = {}
): DocumentEnrichment {
  const document_type = classifyDocument(ocrText);
  const document_preview = buildDocumentPreview(document_type, ocrText, fileName, options);
  const should_store_ocr_text = !(options.attachmentType === "image" && document_type === "other");
  return { document_type, document_preview, should_store_ocr_text };
}

export async function enrichDocumentFromText(
  text: string,
  fileName: string,
  options: DocumentPreviewOptions = {}
): Promise<DocumentEnrichment> {
  const llmFields = await extractDocumentFieldsWithLlm(text, fileName, options.attachmentType);
  let fields = llmFields;

  if (!fields || !isUsefulFields(fields)) {
    fields = extractDocumentFieldsWithRegex(text, fileName);
  }

  const document_preview = buildDocumentPreviewFromFields(fields, fileName);
  const should_store_ocr_text = !(options.attachmentType === "image" && fields.document_type === "other");
  return {
    document_type: fields.document_type,
    document_preview,
    should_store_ocr_text,
  };
}
