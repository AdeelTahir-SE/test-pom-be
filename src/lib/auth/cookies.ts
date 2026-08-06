import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/** Default 30 days — override with REFRESH_TOKEN_MAX_AGE (seconds). */
export function refreshTokenMaxAgeSeconds(): number {
  const raw = process.env.REFRESH_TOKEN_MAX_AGE;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 24 * 30;
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * sameSite=lax so Google OAuth redirects still send cookies.
 * (strict would drop the session on the return hop.)
 */
const SAME_SITE = "lax" as const;

export function applyAuthCookies(
  response: NextResponse,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }
): void {
  const secure = cookieSecure();
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: SAME_SITE,
    maxAge: session.expires_in,
    path: "/",
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: SAME_SITE,
    maxAge: refreshTokenMaxAgeSeconds(),
    path: "/",
  });
}

export function clearAuthCookies(response: NextResponse): void {
  const secure = cookieSecure();
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: SAME_SITE,
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: SAME_SITE,
    maxAge: 0,
    path: "/",
  });
}

function readCookieHeader(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=") || null;
      }
    }
  }
  return null;
}

/** Prefer Authorization Bearer (tests / API clients), else httpOnly cookie. */
export function readAccessToken(request: Request): string | null {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1];
  }
  return readCookieHeader(request, ACCESS_COOKIE);
}

export function readRefreshToken(request: Request): string | null {
  return readCookieHeader(request, REFRESH_COOKIE);
}
