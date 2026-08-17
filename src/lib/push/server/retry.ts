export const MAX_PUSH_ATTEMPTS = 5;

export function nextPushAttemptAt(attempts: number, now = new Date()): string | null {
  if (attempts >= MAX_PUSH_ATTEMPTS) return null;
  const seconds = attempts <= 1 ? 30 : attempts === 2 ? 120 : attempts === 3 ? 600 : 1800;
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

export function isExpiredPushStatus(statusCode?: number): boolean {
  return statusCode === 404 || statusCode === 410;
}

export function isTransientPushStatus(statusCode?: number): boolean {
  if (!statusCode) return true;
  return statusCode === 429 || statusCode >= 500;
}
