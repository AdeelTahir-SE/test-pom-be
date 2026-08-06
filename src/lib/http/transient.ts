/** Detect flaky network / Supabase connectivity errors (vs real auth failures). */
export function isTransientNetworkError(err: unknown): boolean {
  const parts: string[] = [];

  const push = (value: unknown) => {
    if (value == null) return;
    if (value instanceof Error) {
      parts.push(value.message);
      const withCode = value as Error & { code?: string };
      if (withCode.code) parts.push(withCode.code);
      const cause = (value as Error & { cause?: unknown }).cause;
      if (cause) push(cause);
      return;
    }
    if (typeof value === "object" && value !== null && "code" in value) {
      parts.push(String((value as { code: unknown }).code));
    }
    parts.push(String(value));
  };

  push(err);
  const m = parts.join(" ").toLowerCase();

  return (
    m.includes("fetch failed") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("terminated") ||
    m.includes("network") ||
    m.includes("socket") ||
    m.includes("und_err_connect_timeout") ||
    m.includes("und_err_socket") ||
    m.includes("connect timeout") ||
    m.includes("other side closed")
  );
}
