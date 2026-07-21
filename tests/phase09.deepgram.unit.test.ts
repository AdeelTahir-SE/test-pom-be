// Unit tests for the Deepgram integration module — run directly in this
// process (no HTTP to the dev server), using dependency-injected fetch since
// there is no live DEEPGRAM_API_KEY in this environment (Decision D3: build
// now, test mocked). This is the only way to exercise the "successful
// transcription" branch without real credentials or a cross-process mock
// server; API-level coverage of the endpoint's business logic (idempotency,
// fallback behavior, timeline, messages) lives in phase09.voice.test.ts.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { transcribeAudio } from "@/lib/integrations/deepgram";

const ORIGINAL_KEY = process.env.DEEPGRAM_API_KEY;

beforeAll(() => {
  // transcribeAudio short-circuits to null when no key is configured — set
  // a fake one so these unit tests exercise the actual fetch/parse logic.
  process.env.DEEPGRAM_API_KEY = "unit-test-fake-key";
});

afterAll(() => {
  process.env.DEEPGRAM_API_KEY = ORIGINAL_KEY;
});

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("transcribeAudio (unit, mocked fetch)", () => {
  it("returns the transcript on a successful response", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        results: { channels: [{ alternatives: [{ transcript: "We have run out of paint." }] }] },
      })) as unknown as typeof fetch;

    const result = await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(result).toBe("We have run out of paint.");
  });

  it("returns null when the response has no transcript", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ results: { channels: [{ alternatives: [{ transcript: "" }] }] } })) as unknown as typeof fetch;

    const result = await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null on a non-2xx response", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "bad request" }, false)) as unknown as typeof fetch;
    const result = await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const result = await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null immediately when no API key is configured, without calling fetch", async () => {
    process.env.DEEPGRAM_API_KEY = "";
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const result = await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(result).toBeNull();
    expect(called).toBe(false);

    process.env.DEEPGRAM_API_KEY = "unit-test-fake-key";
  });

  it("sends the locked Deepgram configuration in the query string", async () => {
    let capturedUrl: string | undefined;
    const fetchImpl = (async (url: string | URL) => {
      capturedUrl = url.toString();
      return jsonResponse({ results: { channels: [{ alternatives: [{ transcript: "ok" }] }] } });
    }) as unknown as typeof fetch;

    await transcribeAudio(Buffer.from("fake-audio"), "audio/webm", { fetchImpl });
    expect(capturedUrl).toContain("model=nova-3");
    expect(capturedUrl).toContain("language=sl");
    expect(capturedUrl).toContain("punctuate=true");
    expect(capturedUrl).toContain("smart_format=true");
    expect(capturedUrl).toContain("diarize=false");
  });
});
