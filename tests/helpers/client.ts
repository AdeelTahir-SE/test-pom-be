// Minimal HTTP client for integration tests. Hits the running dev server.

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

interface RequestOptions {
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(
  method: string,
  path: string,
  opts: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const isFormData = opts.body instanceof FormData;
  const headers: Record<string, string> = {
    // Omit Content-Type for FormData — fetch sets it with the correct
    // multipart boundary itself; setting it manually breaks the boundary.
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(opts.headers ?? {}),
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body:
      opts.body === undefined ? undefined : isFormData ? (opts.body as FormData) : JSON.stringify(opts.body),
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body: body as T };
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
