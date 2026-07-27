/** Shared phone helpers for one-tap `tel:` calling (Mark: office + worker). */

const PHONE_VISIBLE_RE = /^\+?[0-9\s./()-]{6,}$/;

/** True when the string looks like a dialable phone number. */
export function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  return PHONE_VISIBLE_RE.test(raw.trim());
}

/**
 * Normalize for storage / dialing: keep leading `+`, strip spaces and
 * punctuation. Returns null if empty/invalid.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (!isValidPhone(trimmed)) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 6) return null;
  return hasPlus ? `+${digits}` : digits;
}

/** `tel:+38640111222` or null when not dialable. */
export function toTelHref(raw: string | null | undefined): string | null {
  const normalized = normalizePhone(raw);
  return normalized ? `tel:${normalized}` : null;
}
