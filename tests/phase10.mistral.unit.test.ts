// Unit tests for the Mistral OCR integration module — run directly in this
// process (no HTTP to the dev server), using dependency-injected fetch since
// outbound network to api.mistral.ai is blocked in this sandbox (confirmed
// separately for Deepgram; same network policy applies here). This is the
// only way to exercise the "successful extraction" branch deterministically.
// API-level coverage of the endpoint's business logic (OCR never blocks
// upload, ocr_completed only on success) lives in phase10.ocr.test.ts.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { extractText } from "@/lib/integrations/mistral";

const ORIGINAL_KEY = process.env.MISTRAL_API_KEY;

beforeAll(() => {
  process.env.MISTRAL_API_KEY = "unit-test-fake-key";
});

afterAll(() => {
  process.env.MISTRAL_API_KEY = ORIGINAL_KEY;
});

afterEach(() => {
  vi.useRealTimers();
});

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("extractText (unit, mocked fetch)", () => {
  it("returns concatenated page markdown on a successful response", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        pages: [{ markdown: "Invoice #123" }, { markdown: "Total: $50" }],
      })) as unknown as typeof fetch;

    const result = await extractText(Buffer.from("fake-pdf"), "application/pdf", { fetchImpl });
    expect(result).toBe("Invoice #123\nTotal: $50");
  });

  it("falls back to a top-level text field when pages are absent", async () => {
    const fetchImpl = (async () => jsonResponse({ text: "Plain extracted text" })) as unknown as typeof fetch;
    const result = await extractText(Buffer.from("fake-image"), "image/jpeg", { fetchImpl });
    expect(result).toBe("Plain extracted text");
  });

  it("returns null when no text is present anywhere in the response", async () => {
    const fetchImpl = (async () => jsonResponse({ pages: [{ markdown: "" }] })) as unknown as typeof fetch;
    const result = await extractText(Buffer.from("fake-image"), "image/jpeg", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null on a non-2xx response", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "bad request" }, false)) as unknown as typeof fetch;
    const result = await extractText(Buffer.from("fake-pdf"), "application/pdf", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const result = await extractText(Buffer.from("fake-pdf"), "application/pdf", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null when the OCR request times out", async () => {
    vi.useFakeTimers();
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })) as unknown as typeof fetch;

    const result = extractText(Buffer.from("fake-pdf"), "application/pdf", { fetchImpl });
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(result).resolves.toBeNull();
  });

  it("returns null immediately when no API key is configured, without calling fetch", async () => {
    process.env.MISTRAL_API_KEY = "";
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const result = await extractText(Buffer.from("fake-pdf"), "application/pdf", { fetchImpl });
    expect(result).toBeNull();
    expect(called).toBe(false);

    process.env.MISTRAL_API_KEY = "unit-test-fake-key";
  });
});
