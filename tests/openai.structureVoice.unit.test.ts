import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { structureVoiceTranscript } from "@/lib/integrations/openai";

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

beforeAll(() => {
  process.env.OPENAI_API_KEY = "unit-test-fake-key";
});

afterAll(() => {
  process.env.OPENAI_API_KEY = ORIGINAL_KEY;
});

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("structureVoiceTranscript (unit, mocked fetch)", () => {
  it("returns the structured message on success", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        choices: [{ message: { content: "Potrebujem več barve." } }],
      })) as unknown as typeof fetch;

    const result = await structureVoiceTranscript("potrebujem vec barve", {
      fetchImpl,
    });
    expect(result).toBe("Potrebujem več barve.");
  });

  it("returns null when OpenAI returns empty content", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        choices: [{ message: { content: "  " } }],
      })) as unknown as typeof fetch;

    const result = await structureVoiceTranscript("pozdravljeni", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null on non-2xx", async () => {
    const fetchImpl = (async () => jsonResponse({ error: "nope" }, false)) as unknown as typeof fetch;
    const result = await structureVoiceTranscript("pozdravljeni", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const result = await structureVoiceTranscript("pozdravljeni", { fetchImpl });
    expect(result).toBeNull();
  });

  it("returns null without calling fetch when key is missing", async () => {
    process.env.OPENAI_API_KEY = "";
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const result = await structureVoiceTranscript("pozdravljeni", { fetchImpl });
    expect(result).toBeNull();
    expect(called).toBe(false);

    process.env.OPENAI_API_KEY = "unit-test-fake-key";
  });

  it("returns null for empty input without calling fetch", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const result = await structureVoiceTranscript("   ", { fetchImpl });
    expect(result).toBeNull();
    expect(called).toBe(false);
  });

  it("sends gpt-5.4-mini by default", async () => {
    let body: { model?: string; max_completion_tokens?: number } | undefined;
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as {
        model?: string;
        max_completion_tokens?: number;
      };
      return jsonResponse({
        choices: [{ message: { content: "Ok." } }],
      });
    }) as unknown as typeof fetch;

    await structureVoiceTranscript("ok", { fetchImpl });
    expect(body?.model).toBe("gpt-5.4-mini");
    expect(body?.max_completion_tokens).toBe(300);
  });
});
