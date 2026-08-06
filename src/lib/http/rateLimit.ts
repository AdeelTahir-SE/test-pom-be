/**
 * Simple in-memory sliding window rate limiter.
 * Fine for a first pass on Vercel; replace with Redis/Upstash for multi-instance accuracy.
 */
export type RateLimitBucket = { count: number; resetAt: number };

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function isRateLimited(
  store: Map<string, RateLimitBucket>,
  key: string,
  maxAttempts: number,
  now = Date.now()
): boolean {
  const record = store.get(key);
  if (!record) return false;
  if (now > record.resetAt) {
    store.delete(key);
    return false;
  }
  return record.count >= maxAttempts;
}

export function recordFailedAttempt(
  store: Map<string, RateLimitBucket>,
  key: string,
  windowMs: number,
  now = Date.now()
): void {
  const record = store.get(key);
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  record.count += 1;
}

export function clearRateLimit(
  store: Map<string, RateLimitBucket>,
  key: string
): void {
  store.delete(key);
}
