const MONTHS: Record<string, number> = {
  jan: 1,
  januar: 1,
  januarja: 1,
  january: 1,
  gennaio: 1,
  feb: 2,
  februar: 2,
  februarja: 2,
  february: 2,
  febbraio: 2,
  mar: 3,
  marec: 3,
  marca: 3,
  march: 3,
  marzo: 3,
  apr: 4,
  april: 4,
  aprila: 4,
  aprile: 4,
  maj: 5,
  maja: 5,
  may: 5,
  maggio: 5,
  jun: 6,
  junij: 6,
  junija: 6,
  june: 6,
  giugno: 6,
  jul: 7,
  julij: 7,
  julija: 7,
  july: 7,
  luglio: 7,
  avg: 8,
  avgust: 8,
  avgusta: 8,
  august: 8,
  agosto: 8,
  sep: 9,
  september: 9,
  septembra: 9,
  settembre: 9,
  oct: 10,
  okt: 10,
  oktober: 10,
  oktobra: 10,
  october: 10,
  ottobre: 10,
  nov: 11,
  november: 11,
  novembra: 11,
  novembre: 11,
  dec: 12,
  december: 12,
  decembra: 12,
  dicembre: 12,
};

function yearFrom(value: string): number {
  const year = Number.parseInt(value, 10);
  if (value.length === 2) return year <= 49 ? 2000 + year : 1900 + year;
  return year;
}

function validDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

function normalizeCandidate(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  const numeric = trimmed.match(/\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})\.?\b/);
  if (numeric) {
    const day = Number.parseInt(numeric[1]!, 10);
    const month = Number.parseInt(numeric[2]!, 10);
    const year = yearFrom(numeric[3]!);
    return validDate(day, month, year) ? formatDate(day, month, year) : null;
  }

  const iso = trimmed.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const year = Number.parseInt(iso[1]!, 10);
    const month = Number.parseInt(iso[2]!, 10);
    const day = Number.parseInt(iso[3]!, 10);
    return validDate(day, month, year) ? formatDate(day, month, year) : null;
  }

  const dayMonthName = trimmed.match(/\b(\d{1,2})\.?\s+([A-Za-zČčŠšŽžĆćĐđÀ-ž]+)\.?,?\s+(\d{2,4})\b/);
  if (dayMonthName) {
    const day = Number.parseInt(dayMonthName[1]!, 10);
    const month = MONTHS[dayMonthName[2]!.toLowerCase()];
    const year = yearFrom(dayMonthName[3]!);
    return month && validDate(day, month, year) ? formatDate(day, month, year) : null;
  }

  const monthNameDay = trimmed.match(/\b([A-Za-zČčŠšŽžĆćĐđÀ-ž]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{2,4})\b/i);
  if (monthNameDay) {
    const month = MONTHS[monthNameDay[1]!.toLowerCase()];
    const day = Number.parseInt(monthNameDay[2]!, 10);
    const year = yearFrom(monthNameDay[3]!);
    return month && validDate(day, month, year) ? formatDate(day, month, year) : null;
  }

  return null;
}

export function normalizeDocumentDate(value: string | null | undefined, sourceText = ""): string | null {
  if (!value?.trim()) return null;
  const normalized = normalizeCandidate(value);
  if (normalized) {
    return normalized;
  }

  const fromSource = sourceText
    ? collectNormalizedDates(sourceText).find((candidate) => candidate.raw.includes(value.trim()) || value.includes(candidate.raw))
    : null;
  if (fromSource) {
    return fromSource.normalized;
  }

  return null;
}

export function collectNormalizedDates(text: string): Array<{ raw: string; normalized: string }> {
  const patterns = [
    /\b\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}\.?\b/g,
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b\d{1,2}\.?\s+[A-Za-zČčŠšŽžĆćĐđÀ-ž]+\.?,?\s+\d{2,4}\b/g,
    /\b[A-Za-zČčŠšŽžĆćĐđÀ-ž]+\.?\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{2,4}\b/gi,
  ];
  const results: Array<{ raw: string; normalized: string }> = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[0];
      const normalized = normalizeCandidate(raw);
      if (normalized && !results.some((item) => item.raw === raw && item.normalized === normalized)) {
        results.push({ raw, normalized });
      }
    }
  }
  return results;
}
