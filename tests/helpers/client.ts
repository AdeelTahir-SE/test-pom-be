// Minimal HTTP client for integration tests. Hits the running dev server.
// Auth sessions are httpOnly cookies; we also parse Set-Cookie so existing
// tests can keep using Authorization: Bearer with the access token value.

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  cookies: Record<string, string>;
}

interface RequestOptions {
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookie?: string;
}

function parseSetCookie(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const lines =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : [];
  // Fallback: some runtimes only expose a single set-cookie header.
  if (lines.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) lines.push(single);
  }
  for (const line of lines) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    out[name] = value;
  }
  return out;
}

function mergeAuthTokensIntoBody<T>(
  body: T,
  cookies: Record<string, string>
): T {
  if (!body || typeof body !== "object") return body;
  const record = body as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? { ...(record.data as Record<string, unknown>) }
      : {};
  if (cookies.access_token && data.access_token == null) {
    data.access_token = cookies.access_token;
  }
  if (cookies.refresh_token && data.refresh_token == null) {
    data.refresh_token = cookies.refresh_token;
  }
  if (Object.keys(data).length === 0) return body;
  return { ...record, data } as T;
}

async function request<T = unknown>(
  method: string,
  path: string,
  opts: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const isFormData = opts.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(opts.headers ?? {}),
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.cookie) headers["Cookie"] = opts.cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : isFormData
          ? (opts.body as FormData)
          : JSON.stringify(opts.body),
  });

  const cookies = parseSetCookie(res);

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  body = mergeAuthTokensIntoBody(body, cookies);

  return { status: res.status, body: body as T, cookies };
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, opts),
  post: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>("POST", path, opts),
  patch: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>("PATCH", path, opts),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),
  baseUrl: BASE_URL,
};
