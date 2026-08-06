"use client";

// Thin fetch wrapper for the frontend. Same-origin (frontend + backend share
// one Next.js app now), so paths are plain "/api/..." — no base URL, no CORS.
// Session tokens live in httpOnly cookies; JS only tracks expiry for proactive refresh.

const EXPIRES_AT_KEY = "saas_expires_at";
const SESSION_HINT_KEY = "saas_session_hint";
const REFRESH_LOCK_NAME = "saas_auth_refresh";
const LEGACY_TOKEN_KEY = "saas_access_token";
const LEGACY_REFRESH_KEY = "saas_refresh_token";

/** Refresh a bit before JWT expiry so polling doesn't all hit 401 at once. */
const REFRESH_SKEW_MS = 60_000;

/** Auth endpoints that must never trigger silent refresh (avoids loops). */
const AUTH_NO_REFRESH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/register/google",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/google",
  "/api/auth/oauth/callback",
]);

export type RefreshOutcome = "ok" | "auth_failed" | "transient" | "no_token";

function clearLegacyTokenStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
}

function getExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setExpiresAt(expiresAtMs: number | null): void {
  if (typeof window === "undefined") return;
  if (expiresAtMs == null) sessionStorage.removeItem(EXPIRES_AT_KEY);
  else sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAtMs));
}

function setSessionHint(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) sessionStorage.setItem(SESSION_HINT_KEY, "1");
  else sessionStorage.removeItem(SESSION_HINT_KEY);
}

/** True if we believe cookies may still hold a session (hint only). */
export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_HINT_KEY) === "1" || getExpiresAt() != null;
}

/**
 * @deprecated Tokens are httpOnly cookies — always null from JS.
 * Kept so older call sites compile; prefer hasSessionHint().
 */
export function getToken(): string | null {
  return null;
}

/** @deprecated Refresh token is httpOnly — always null from JS. */
export function getRefreshToken(): string | null {
  return null;
}

export function setToken(_token: string | null): void {
  // no-op — cookies are set by the server
}

export function setRefreshToken(_token: string | null): void {
  // no-op — cookies are set by the server
}

/**
 * After login/register/oauth/refresh: record expiry hint only.
 * - setSession(null, null) → clear client hint
 * - setSession(null, null, expiresIn) → mark logged in (cookies set by server)
 */
export function setSession(
  _accessToken: string | null,
  _refreshToken: string | null,
  expiresInSeconds?: number | null
): void {
  clearLegacyTokenStorage();
  if (
    _accessToken == null &&
    _refreshToken == null &&
    (expiresInSeconds === undefined || expiresInSeconds === null)
  ) {
    setExpiresAt(null);
    setSessionHint(false);
    return;
  }
  const ttl =
    typeof expiresInSeconds === "number" && expiresInSeconds > 0
      ? expiresInSeconds
      : 3600;
  setExpiresAt(Date.now() + ttl * 1000);
  setSessionHint(true);
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResult<T> {
  status: number;
  data?: T;
  error?: ApiError;
}

function authPathWithoutQuery(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

function shouldAttemptSilentRefresh(path: string): boolean {
  return !AUTH_NO_REFRESH_PATHS.has(authPathWithoutQuery(path));
}

function accessTokenNeedsRefresh(): boolean {
  const expiresAt = getExpiresAt();
  // No client expiry hint (e.g. hard refresh) — ask the server via cookie refresh.
  if (expiresAt == null) return true;
  return Date.now() >= expiresAt - REFRESH_SKEW_MS;
}

let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(REFRESH_LOCK_NAME, fn);
  }
  return fn();
}

async function performRefresh(): Promise<RefreshOutcome> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (res.status === 401 || res.status === 403) {
      setSession(null, null);
      return "auth_failed";
    }
    if (!res.ok) {
      return "transient";
    }

    const json = (await res.json()) as {
      data?: { expires_in?: number };
    };
    setSession(null, null, json?.data?.expires_in ?? 3600);
    return "ok";
  } catch {
    return "transient";
  }
}

export async function tryRefreshSession(): Promise<boolean> {
  const outcome = await refreshSession();
  return outcome === "ok";
}

export async function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      return await withRefreshLock(performRefresh);
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureFreshAccessToken(): Promise<void> {
  if (!accessTokenNeedsRefresh()) return;
  await refreshSession();
}

function forceLogoutToLogin(): void {
  setSession(null, null);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retryCount = 0
): Promise<ApiResult<T>> {
  if (retryCount === 0 && shouldAttemptSilentRefresh(path)) {
    await ensureFreshAccessToken();
  }

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    return {
      status: 0,
      error: { code: "network_error", message: "Network request failed." },
    };
  }

  let json: { data?: T; error?: ApiError } | null = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (res.status === 401 && shouldAttemptSilentRefresh(path) && retryCount < 2) {
    const outcome = await refreshSession();
    if (outcome === "ok") {
      return request<T>(method, path, body, retryCount + 1);
    }
    if (outcome === "transient") {
      return { status: res.status, data: json?.data, error: json?.error };
    }
    forceLogoutToLogin();
  }

  return { status: res.status, data: json?.data, error: json?.error };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
};
