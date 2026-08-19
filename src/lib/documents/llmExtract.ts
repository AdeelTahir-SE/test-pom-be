import { z } from "zod";
import { DOCUMENT_TYPES, type AttachmentType, type DocumentType } from "@/config/constants";
import { env } from "@/lib/env";
import { collectNormalizedDates, normalizeDocumentDate } from "./date";

const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";

const emittedDocumentTypes = DOCUMENT_TYPES.filter(
  (type): type is Exclude<DocumentType, "receipt"> => type !== "receipt"
);

const confidenceSchema = z
  .object({
    document_type: z.number().min(0).max(1).optional(),
    document_number: z.number().min(0).max(1).optional(),
    customer_name: z.number().min(0).max(1).optional(),
    date: z.number().min(0).max(1).optional(),
    amount: z.number().min(0).max(1).optional(),
    title: z.number().min(0).max(1).optional(),
  })
  .partial()
  .optional();

const rawExtractionSchema = z.object({
  document_type: z.enum(emittedDocumentTypes as [Exclude<DocumentType, "receipt">, ...Array<Exclude<DocumentType, "receipt">>]),
  document_number: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  confidence: confidenceSchema,
});

export interface ExtractedDocumentFields {
  document_type: Exclude<DocumentType, "receipt">;
  document_number: string | null;
  customer_name: string | null;
  date: string | null;
  amount: string | null;
  title: string | null;
  confidence?: Record<string, number | undefined>;
  source: "llm" | "regex";
}

export interface LlmExtractDeps {
  fetchImpl?: typeof fetch;
}

function cleanField(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

function compact(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[|:;,.]/g, "");
}

function amountCompact(value: string): string {
  return compact(value).replace(/eur/g, "€");
}

function sourceContains(sourceText: string, value: string, kind: keyof Omit<ExtractedDocumentFields, "document_type" | "source" | "confidence">): boolean {
  const source = kind === "amount" ? amountCompact(sourceText) : compact(sourceText);
  const needle = kind === "amount" ? amountCompact(value) : compact(value);
  return needle.length > 0 && source.includes(needle);
}

function validateField(
  field: keyof Omit<ExtractedDocumentFields, "document_type" | "source" | "confidence">,
  value: string | null,
  sourceText: string,
  _fileName: string
): string | null {
  if (!value) return null;
  if (field === "date") {
    const normalized = normalizeDocumentDate(value, sourceText);
    if (!normalized) return null;
    const sourceDates = collectNormalizedDates(sourceText);
    if (!sourceDates.some((candidate) => candidate.normalized === normalized)) return null;
    return normalized;
  }
  if (!sourceContains(sourceText, value, field)) return null;
  return value;
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("LLM response did not contain a JSON object.");
    return JSON.parse(match[0]);
  }
}

function systemPrompt(): string {
  return [
    "You extract document metadata from OCR or parsed document text.",
    "Return one JSON object only. Do not include markdown.",
    "Allowed document_type values: invoice, offer, contract, service_report, delivery_note, other.",
    "Extract only values supported by the source text. Use null when unsure.",
    "Prefer the main document heading/title over incidental mentions.",
    "Classify by the main heading/title first, not by field labels, footer labels, bank-account text, or issuer metadata.",
    "If the main heading/title contains Predračun, Predracun, Predračun #, predračun, predraćun, predračun/ponuda, proforma, ponudba, ponuda, quote, quotation, Angebot, Offerte, offerta, preventivo, or quotazione, document_type must be offer.",
    "Words like Datum računa, Račun izdao, transakcijski račun, bankovni račun, IBAN, or payment-account labels do not make a document an invoice.",
    "Račun št., Faktura, Invoice, Rechnung, Fattura, Ricevuta, or Receipt in the main heading/title means invoice unless the same main heading/title says Predračun/proforma/ponudba/quote.",
    "For invoices, customer_name is the buyer/recipient/customer, not issuer/vendor/seller.",
    "For date, prefer issue/document/invoice date. Avoid due date, payment deadline, service/performed date unless no better document date exists.",
    "For amount, prefer final amount payable/total due including tax. Also include the currency (sign) if it exists and omit it if there's no mention of currency.",
  ].join(" ");
}

function userPrompt(text: string, fileName: string, attachmentType: AttachmentType | null | undefined): string {
  return [
    `File name: ${fileName}`,
    `Attachment type: ${attachmentType ?? "unknown"}`,
    "Return JSON with this exact shape:",
    '{"document_type":"invoice|offer|contract|service_report|delivery_note|other","document_number":string|null,"customer_name":string|null,"date":string|null,"amount":string|null,"title":string|null,"confidence":{"document_type":number,"document_number":number,"customer_name":number,"date":number,"amount":number,"title":number}}',
    "Document text:",
    text.slice(0, 24_000),
  ].join("\n\n");
}

export async function extractDocumentFieldsWithLlm(
  text: string,
  fileName: string,
  attachmentType: AttachmentType | null | undefined,
  deps: LlmExtractDeps = {}
): Promise<ExtractedDocumentFields | null> {
  const apiKey = env.mistralApiKey;
  if (!apiKey) {
    console.log("[ocr] Document LLM extraction skipped: missing MISTRAL_API_KEY", { fileName });
    return null;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = env.documentLlmExtractTimeoutMs;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(MISTRAL_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.mistralDocumentExtractModel,
        temperature: 0,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(text, fileName, attachmentType) },
        ],
      }),
    });

    if (!response.ok) {
      const bodySnippet = await response.text().catch(() => "");
      console.log("[ocr] Document LLM extraction failed", {
        fileName,
        reason: "non_2xx",
        status: response.status,
        statusText: response.statusText,
        bodySnippet: bodySnippet.slice(0, 500),
      });
      return null;
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.log("[ocr] Document LLM extraction failed", {
        fileName,
        reason: "empty_content",
      });
      return null;
    }

    const parsed = rawExtractionSchema.safeParse(parseJsonObject(content));
    if (!parsed.success) {
      console.log("[ocr] Document LLM extraction failed", {
        fileName,
        reason: "schema_validation_failed",
        issues: parsed.error.issues.map((issue) => issue.message).slice(0, 5),
      });
      return null;
    }

    const fields: ExtractedDocumentFields = {
      document_type: parsed.data.document_type,
      document_number: validateField("document_number", cleanField(parsed.data.document_number), text, fileName),
      customer_name: validateField("customer_name", cleanField(parsed.data.customer_name), text, fileName),
      date: validateField("date", cleanField(parsed.data.date), text, fileName),
      amount: validateField("amount", cleanField(parsed.data.amount), text, fileName),
      title: validateField("title", cleanField(parsed.data.title), text, fileName),
      confidence: parsed.data.confidence,
      source: "llm",
    };

    return fields;
  } catch (error) {
    console.log("[ocr] Document LLM extraction error", {
      fileName,
      reason: "request_error",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
