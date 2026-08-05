"use client";

// Thin fetch wrapper for the frontend. Same-origin (frontend + backend share
// one Next.js app now), so paths are plain "/api/..." — no base URL, no CORS.

const TOKEN_KEY = "saas_access_token";
const REFRESH_TOKEN_KEY = "saas_refresh_token";
const EXPIRES_AT_KEY = "saas_expires_at";
const REFRESH_LOCK_NAME = "saas_auth_refresh";

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

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(EXPIRES_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setExpiresAt(expiresAtMs: number | null): void {
  if (typeof window === "undefined") return;
  if (expiresAtMs == null) localStorage.removeItem(EXPIRES_AT_KEY);
  else localStorage.setItem(EXPIRES_AT_KEY, String(expiresAtMs));
}

/** Best-effort JWT exp (ms) — client hint only, not a security check. */
function jwtExpiresAtMs(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function resolveExpiresAtMs(
  accessToken: string,
  expiresInSeconds?: number | null
): number | null {
  if (typeof expiresInSeconds === "number" && expiresInSeconds > 0) {
    return Date.now() + expiresInSeconds * 1000;
  }
  return jwtExpiresAtMs(accessToken);
}

// Call after login/register with both tokens from the response so an expired
// access token (1hr TTL) can be silently renewed instead of forcing a re-login.
export function setSession(
  accessToken: string | null,
  refreshToken: string | null,
  expiresInSeconds?: number | null
): void {
  setToken(accessToken);
  setRefreshToken(refreshToken);
  if (accessToken) {
    setExpiresAt(resolveExpiresAtMs(accessToken, expiresInSeconds));
  } else {
    setExpiresAt(null);
  }
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
  const token = getToken();
  if (!token) return Boolean(getRefreshToken());
  const expiresAt = getExpiresAt() ?? jwtExpiresAtMs(token);
  if (expiresAt == null) return false;
  return Date.now() >= expiresAt - REFRESH_SKEW_MS;
}

/** Single-flight refresh so concurrent requests in one tab share one attempt. */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(REFRESH_LOCK_NAME, fn);
  }
  return fn();
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshTokenBefore = getRefreshToken();
  if (!refreshTokenBefore) return "no_token";

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshTokenBefore }),
    });

    // Another tab may have already rotated the refresh token and written
    // new access/refresh tokens while we were waiting on the network.
    const tokenAfter = getToken();
    const refreshAfter = getRefreshToken();
    if (
      refreshAfter &&
      refreshAfter !== refreshTokenBefore &&
      tokenAfter &&
      !accessTokenNeedsRefresh()
    ) {
      return "ok";
    }

    if (res.status === 401 || res.status === 403) {
      return "auth_failed";
    }
    if (!res.ok) {
      return "transient";
    }

    const json = (await res.json()) as {
      data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
    };
    const accessToken = json?.data?.access_token;
    if (!accessToken) return "auth_failed";

    setSession(
      accessToken,
      json.data?.refresh_token ?? refreshAfter ?? refreshTokenBefore,
      json.data?.expires_in
    );
    return "ok";
  } catch {
    // Network blip — keep existing tokens so polling can retry later.
    const tokenAfter = getToken();
    const refreshAfter = getRefreshToken();
    if (
      refreshAfter &&
      refreshAfter !== refreshTokenBefore &&
      tokenAfter
    ) {
      return "ok";
    }
    return "transient";
  }
}

/**
 * Exchange refresh token for a new access token.
 * - ok: session updated (or another tab already did)
 * - auth_failed: refresh truly dead — safe to force re-login
 * - transient: network/5xx — do NOT wipe the session
 * - no_token: nothing to refresh with
 */
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

/** Proactively refresh if the access token is near expiry. */
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

  const token = getToken();
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
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

  // Access token expired or invalid — try one silent refresh-and-retry before
  // giving up. /api/auth/me MUST refresh (Mark: refresh/new tab was wiping session).
  // Login/register/refresh themselves stay excluded to avoid loops.
  if (res.status === 401 && shouldAttemptSilentRefresh(path) && retryCount < 2) {
    const outcome = await refreshSession();
    if (outcome === "ok") {
      return request<T>(method, path, body, retryCount + 1);
    }
    if (outcome === "transient") {
      // Keep tokens; let the caller see the 401 without killing the session.
      return { status: res.status, data: json?.data, error: json?.error };
    }

    // auth_failed / no_token — but another tab may have written fresher tokens.
    const latest = getToken();
    if (latest && latest !== token) {
      return request<T>(method, path, body, retryCount + 1);
    }

    // Confirmed dead session — only then hard logout.
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
