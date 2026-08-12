import { DOCUMENT_TYPES, type DocumentType } from "@/config/constants";

export type { DocumentType };

interface TypeRule {
  type: Exclude<DocumentType, "other">;
  strong: RegExp[];
  weak: RegExp[];
  negative?: RegExp[];
}

const RULES: TypeRule[] = [
  {
    type: "invoice",
    strong: [
      /\binvoice\s*(no\.?|number|#|nr\.?)?\b/i,
      /\bra[cč]un(?!al)/i,              // vse oblike računa, ne pa računalnik
      /\bbroj\s+ra[cč]una\b/i,
      /\bšt\.?\s*ra[cč]una\b/i,
      /\binvoice\s*date\b/i,
      /\bdatum\s+ra[cč]una\b/i,
      /\bprodavatelj\w*\b/i,
    ],
    weak: [
      /\bvat\b/i,
      /\bddv\b/i,
      /\bpdv\b/i,
      /\btotal\b/i,
      /\bamount\s*due\b/i,
      /\bznesek\w*\b/i,
      /\bukupan\s+iznos\b/i,
      /\bkupc\w*\b/i,
    ],
    negative: [
      /\bpogodb\w*\b/i,
      /\bcontract\b/i,
      /\bdobavnic\w*\b/i,
      /\bdelivery\s*note\b/i,
      /\bservisn\w*\s*(list|poro[cč]ilo)\b/i,
      /\bservice\s*report\b/i,
      /\bpotrdil\w*\b/i,
      /\breceipt\b/i,
    ],
  },
  {
    type: "delivery_note",
    strong: [/\bdelivery\s*note\b/i, /\bdobavnic\w*\b/i, /\bpacking\s*list\b/i],
    weak: [/\bdeliver\w*\b/i, /\bdostavljen\w*\b/i, /\bitems?\s*delivered\b/i],
    negative: [
      /\bšt\.?\s*ra[cč]una\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\bznesek\w*\b/i,
      /\bamount\s*due\b/i,
      /\bukupan\s+iznos\b/i,
    ],
  },
  {
    type: "contract",
    strong: [
      /\bcontract\b/i,
      /\bpogodb\w*\b/i,
      /\bvzorec\s+pogodbe\b/i,
      /\bagreement\b/i,
    ],
    weak: [/\bparties\b/i, /\bstrank\w*\b/i, /\btrajan\w*\b/i, /\bsofinanc/i],
    negative: [
      /\bšt\.?\s*ra[cč]una\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\binvoice\s*(no\.?|number|#|nr\.?)?\b/i,
    ],
  },
  {
    type: "service_report",
    strong: [
      /\bservice\s*report\b/i,
      /\bservisn\w*\s*(list|poro[cč]ilo)\b/i,
      /\bperformed\s*work\b/i,
      /\bopravljen\w*\s*del\w*\b/i,
    ],
    weak: [/\btechnician\w*\b/i, /\btehnik\w*\b/i, /\bmaintenance\b/i, /\bvzdrževanj\w*\b/i],
    negative: [
      /\bšt\.?\s*ra[cč]una\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\bznesek\w*\b/i,
      /\bamount\s*due\b/i,
    ],
  },
  {
    type: "offer",
    strong: [
      /\bponudb\w*\b/i,        // ponudba, ponudbe, ponudbi, ponudbo...
      /\bponud[aeiou]\b/i,     // ponuda, ponude, ponudi, ponudo (HR)
      /\bangebot\w*\b/i,
      /\bofferta\b/i,
      /\bPREDRACUN_OFFER\b/,
    ],
    weak: [
      /\boffer\s*(?:no\.?|number|#)?\b/i,
      /\bquotation\b/i,
      /\bquote\b/i,
      /\bvalid\s*until\b/i,
      /\bvelja\s*do\b/i,
      /\bestimated\s*cost\b/i,
    ],
    negative: [
      /\bšt\.?\s*ra[cč]una\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\binvoice\s*date\b/i,
      /\bdatum\s+ra[cč]una\b/i,
    ],
  },
  {
    type: "receipt",
    strong: [/\breceipt\b/i, /\bpotrdil\w*\b/i, /\bfiskaln\w*\b/i, /\bcash\s*receipt\b/i],
    weak: [/\bpaid\b/i, /\bpla[cč]an\w*\b/i, /\bthank\s*you\s*for\s*your\s*purchase\b/i],
    negative: [
      /\bšt\.?\s*ra[cč]una\b/i,
      /\bbroj\s+ra[cč]una\b/i,
      /\binvoice\s*(no\.?|number|#|nr\.?)?\b/i,
    ],
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
  if (rule.negative) {
    for (const re of rule.negative) {
      if (re.test(text)) score -= 3;
    }
  }
  return score;
}

export function classifyDocument(ocrText: string): DocumentType {
  const text = ocrText
    .trim()
    .replace(
      /\b(?:žiro|tekoči|transakcijski|osnovni|varčevalni|devizni|poslovni|osebni|gospodinjski)\s*ra[cč]un\w*\b/gi,
      "BANK_ACCOUNT"
    )
    .replace(/\b(?:IBAN|SWIFT|BIC)\b/gi, "BANK_CODE")
    .replace(/\bpredra[cč]un\w*\b/gi, "PREDRACUN_OFFER");

  if (!text) return "other";

  // ABSOLUTNO PRAVILO: predračun je vedno ponudba
  if (text.includes("PREDRACUN_OFFER")) {
    return "offer";
  }

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
