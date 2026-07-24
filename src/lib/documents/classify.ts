import { DOCUMENT_TYPES, type DocumentType } from "@/config/constants";

export type { DocumentType };

interface TypeRule {
  type: Exclude<DocumentType, "other">;
  /** Whole-phrase / strong signals — worth 3 points each. */
  strong: RegExp[];
  /** Weaker keywords — 1 point each. */
  weak: RegExp[];
}

// Deterministic MVP rules (Add-on 1 §2). No AI. EN + SI/HR.
const RULES: TypeRule[] = [
  {
    type: "invoice",
    strong: [
      /\binvoice\s*(no\.?|number|#|nr\.?)?\b/i,
      /\bra[cč]un\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\bšt\.?\s*ra[cč]una\b/i,
      /\binvoice\s*date\b/i,
      /\bdatum\s+ra[cč]una\b/i,
      /\bprodavatelj\b/i,
    ],
    weak: [
      /\bvat\b/i,
      /\bddv\b/i,
      /\bpdv\b/i,
      /\btotal\b/i,
      /\bamount\s*due\b/i,
      /\bznesek\b/i,
      /\bukupan\s+iznos\b/i,
      /\bkupac\b/i,
    ],
  },
  {
    type: "delivery_note",
    strong: [/\bdelivery\s*note\b/i, /\bdobavnica\b/i, /\bpacking\s*list\b/i],
    weak: [/\bdelivered\b/i, /\bdostavljeno\b/i, /\bitems?\s*delivered\b/i],
  },
  {
    type: "contract",
    strong: [
      /\bcontract\b/i,
      /\bpogodb[aeio]\b/i,
      /\bvzorec\s+pogodbe\b/i,
      /\bagreement\b/i,
    ],
    weak: [/\bparties\b/i, /\bstrank[aei]\b/i, /\bduration\b/i, /\btrajanje\b/i, /\bsofinanc/i],
  },
  {
    type: "service_report",
    strong: [
      /\bservice\s*report\b/i,
      /\bservisn[ia]\s*(list|poro[cč]ilo)\b/i,
      /\bperformed\s*work\b/i,
      /\bopravljeno\s*delo\b/i,
    ],
    weak: [/\btechnician\b/i, /\btehnik\b/i, /\bmaintenance\b/i, /\bvzdrževanje\b/i],
  },
  {
    type: "offer",
    strong: [/\bquotation\b/i, /\bquote\b/i, /\bponudba\b/i, /\boffer\s*(no\.?|number|#)?\b/i],
    weak: [/\bvalid\s*until\b/i, /\bvelja\s*do\b/i, /\bestimated\s*cost\b/i],
  },
  {
    type: "receipt",
    strong: [/\breceipt\b/i, /\bpotrdilo\b/i, /\bfiskaln/i, /\bcash\s*receipt\b/i],
    weak: [/\bpaid\b/i, /\bpla[cč]ano\b/i, /\bthank\s*you\s*for\s*your\s*purchase\b/i],
  },
];

const MIN_SCORE = 2;

function scoreText(text: string, rule: TypeRule): number {
  let score = 0;
  for (const re of rule.strong) {
    if (re.test(text)) score += 3;
  }
  for (const re of rule.weak) {
    if (re.test(text)) score += 1;
  }
  return score;
}

/**
 * Classify OCR text into one document category (Add-on 1 §1–§2).
 * Returns `other` when confidence is too low.
 */
export function classifyDocument(ocrText: string): DocumentType {
  // "transakcijski račun" = bank account, not an invoice title.
  const text = ocrText
    .trim()
    .replace(/transakcijsk[iaei]?\s+ra[cč]un\w*/gi, "BANK_ACCOUNT");
  if (!text) return "other";

  let best: DocumentType = "other";
  let bestScore = 0;

  for (const rule of RULES) {
    const score = scoreText(text, rule);
    if (score > bestScore) {
      bestScore = score;
      best = rule.type;
    }
  }

  return bestScore >= MIN_SCORE ? best : "other";
}

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);
}
