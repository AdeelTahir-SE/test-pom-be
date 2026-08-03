/**
 * Client-side error helpers (Mark a11): never swallow failures silently —
 * log structured context and surface a clear user message.
 */

export function logClientError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  const base =
    err instanceof Error
      ? { name: err.name, message: err.message }
      : { name: typeof err, message: String(err) };

  console.error("[client-error]", {
    context,
    ...base,
    ...extra,
  });
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    return /fetch|network|failed to fetch|load failed/i.test(err.message);
  }
  return false;
}

export function isMicPermissionError(err: unknown): boolean {
  if (!(err instanceof DOMException) && !(err instanceof Error)) return false;
  return /NotAllowedError|PermissionDeniedError|NotFoundError|NotReadableError/i.test(
    err.name
  );
}

/**
 * Pick a toast string for an unexpected throw.
 * Prefer API `error.message` at call sites when you have an ApiResult.
 */
export function userFacingCatchMessage(
  err: unknown,
  fallback: string,
  networkMessage: string,
  micMessage?: string
): string {
  if (isNetworkError(err)) return networkMessage;
  if (micMessage && isMicPermissionError(err)) return micMessage;
  return fallback;
}

/** Prefer the API's message; fall back by HTTP status when useful. */
export function apiFailureMessage(
  error: { message?: string; code?: string } | undefined,
  status: number | undefined,
  fallback: string
): string {
  if (error?.message?.trim()) return error.message;
  if (status === 401 || status === 403) return fallback;
  if (status !== undefined && status >= 500) return fallback;
  return fallback;
}
