"use client";

// Thin fetch wrapper for the frontend. Same-origin (frontend + backend share
// one Next.js app now), so paths are plain "/api/..." — no base URL, no CORS.

const TOKEN_KEY = "saas_access_token";
const REFRESH_TOKEN_KEY = "saas_refresh_token";

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

// Call after login/register with both tokens from the response so an expired
// access token (1hr TTL) can be silently renewed instead of forcing a re-login.
export function setSession(accessToken: string | null, refreshToken: string | null): void {
  setToken(accessToken);
  setRefreshToken(refreshToken);
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

/** Single-flight refresh so multiple tabs/requests don't burn the refresh token. */
let refreshInFlight: Promise<boolean> | null = null;

export async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      const accessToken = json?.data?.access_token;
      if (!accessToken) return false;
      setSession(accessToken, json.data.refresh_token ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetry = false
): Promise<ApiResult<T>> {
  const token = getToken();
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

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
  if (res.status === 401 && shouldAttemptSilentRefresh(path)) {
    if (!isRetry) {
      const refreshed = await tryRefreshSession();
      if (refreshed) return request<T>(method, path, body, true);
    }
    setSession(null, null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  return { status: res.status, data: json?.data, error: json?.error };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
};
