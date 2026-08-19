import { DOCUMENT_TYPES, type DocumentType } from "@/config/constants";

export type { DocumentType };

type EmittedDocumentType = Exclude<DocumentType, "other" | "receipt">;

interface TypeRule {
  type: EmittedDocumentType;
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
      /\bfaktur[ae]?\b/i,
      /\brechnung\b/i,
      /\bfattur[ae]\b/i,
      /\bricevuta\b/i,
      /\breceipt\b/i,
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
    ],
  },
  {
    type: "delivery_note",
    strong: [
      /\bdelivery\s*note\b/i,
      /\bdobavnic\w*\b/i,
      /\bspremnic\w*\b/i,
      /\btovorni\s+list\b/i,
      /\bCMR\b/,
      /\bprevozni\s+nalog\b/i,
      /\bodpremnic\w*\b/i,
      /\blieferschein\b/i,
      /\bbegleitpapier\b/i,
      /\bfrachtbrief\b/i,
      /\btransportauftrag\b/i,
      /\bversandschein\b/i,
      /\botpremnic\w*\b/i,
      /\bdostavnic\w*\b/i,
      /\bteretnic\w*\b/i,
      /\bprijevozni\s+nalog\b/i,
      /\bbolla\s+di\s+consegna\b/i,
      /\bdocumento\s+di\s+trasporto\b/i,
      /\blettera\s+di\s+vettura\b/i,
      /\bordine\s+di\s+trasporto\b/i,
      /\bpacking\s*list\b/i,
    ],
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
      /\bdogovor\w*\b/i,
      /\bkoncesij\w*\b/i,
      /\baneks\w*\b/i,
      /\bvertrag\b/i,
      /\bugovor\w*\b/i,
      /\bcontratto\b/i,
      /\baccordo\b/i,
      /\bconvenzione\b/i,
      /\bappendice\b/i,
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
      /\bservis\b/i,
      /\bservisn\w*\s*(list|poro[cč]ilo)\b/i,
      /\bdelovni\s+nalog\b/i,
      /\bnalog\b/i,
      /\bporo[cč]il\w*\b/i,
      /\bprevzemni\s+zapisnik\b/i,
      /\bzapisnik(?:\s+o\s+pregledu)?\b/i,
      /\bobra[cč]un(?:\s+stro[sš]kov)?\b/i,
      /\bprotokoll\b/i,
      /\barbeitsauftrag\b/i,
      /\bauftrag\b/i,
      /\bbericht\b/i,
      /\bübergabeprotokoll\b/i,
      /\binspektionsbericht\b/i,
      /\babrechnung\b/i,
      /\bkostenabrechnung\b/i,
      /\bnebenkostenabrechnung\b/i,
      /\bradni\s+nalog\b/i,
      /\bizvje[sš]taj\b/i,
      /\bzapisnik\s+primopredaje\b/i,
      /\bzapisnik\s+pregleda\b/i,
      /\bobra[cč]un\s+tro[sš]kova\b/i,
      /\bverbale\b/i,
      /\bservizio\b/i,
      /\bordine\s+di\s+lavoro\b/i,
      /\brapporto\b/i,
      /\bverbale\s+di\s+consegna\b/i,
      /\brapporto\s+di\s+ispezione\b/i,
      /\brendiconto\b/i,
      /\briparto\s+spese\b/i,
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
      /\bofferte\b/i,
      /\bofferta\b/i,
      /\bpreventivo\b/i,
      /\bproforma\b/i,
      /\bquotazione\b/i,
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
  // Bank-account "račun" / IBAN must not score as invoice; predračun → offer.
  const original = ocrText.trim();
  const hasClearInvoiceHeading =
    /^\s*(?:#\s*)?ra[cč]un\s*(?:št\.?|st\.?|številka|stevilka|nr\.?|no\.?|:|$)/im.test(original) ||
    /^\s*(?:#\s*)?invoice\s*(?:no\.?|number|#|nr\.?|:|$)/im.test(original);
  const text = original
    .trim()
    .replace(
      /\b(?:žiro|tekoči|transakcijski|osnovni|varčevalni|devizni|poslovni|osebni|gospodinjski)\s*ra[cč]un\w*\b/gi,
      "BANK_ACCOUNT"
    )
    .replace(/\b(?:IBAN|SWIFT|BIC)\b/gi, "BANK_CODE")
    .replace(/\bpredra[cč]un\w*\b/gi, "PREDRACUN_OFFER");

  if (!text) return "other";

  // Predračun usually means offer, unless the document itself is clearly an invoice
  // and predračun only appears as payment/context text.
  if (text.includes("PREDRACUN_OFFER") && !hasClearInvoiceHeading) {
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
