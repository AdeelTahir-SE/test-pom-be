import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chatComplete } from "@/lib/integrations/mistral";
import { parseSummaryOutput } from "@/lib/services/dailySummary";

const ORIGINAL_KEY = process.env.MISTRAL_API_KEY;

beforeAll(() => {
  process.env.MISTRAL_API_KEY = "unit-test-fake-key";
});

afterAll(() => {
  process.env.MISTRAL_API_KEY = ORIGINAL_KEY;
});

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Add-on 3 — parseSummaryOutput", () => {
  it("splits POZORNOST attention line from the body", () => {
    const raw = [
      "4 od 5 terenskih del poteka po načrtu.",
      "Max je zaključil večino nalog.",
      "POZORNOST: preveriti material za Markovo delo.",
    ].join("\n");
    const parsed = parseSummaryOutput(raw);
    expect(parsed.summary_text).toContain("4 od 5");
    expect(parsed.attention).toBe("preveriti material za Markovo delo.");
  });

  it("accepts English Attention label", () => {
    const parsed = parseSummaryOutput("Work is on track.\nAttention: check waiting job #003.");
    expect(parsed.summary_text).toContain("on track");
    expect(parsed.attention).toBe("check waiting job #003.");
  });

  it("returns null attention when none is present", () => {
    const parsed = parseSummaryOutput("Dan brez večjih težav. Vsa dela zaključena.");
    expect(parsed.attention).toBeNull();
    expect(parsed.summary_text.length).toBeGreaterThan(0);
  });
});

describe("chatComplete (unit, mocked fetch)", () => {
  it("returns assistant content on success", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        choices: [{ message: { content: "  Brief day summary.  " } }],
      })) as unknown as typeof fetch;

    const result = await chatComplete("sys", "user", { fetchImpl });
    expect(result).toBe("Brief day summary.");
  });

  it("returns null on failure or empty content", async () => {
    const fail = (async () => jsonResponse({}, false)) as unknown as typeof fetch;
    expect(await chatComplete("s", "u", { fetchImpl: fail })).toBeNull();

    const empty = (async () =>
      jsonResponse({ choices: [{ message: { content: "   " } }] })) as unknown as typeof fetch;
    expect(await chatComplete("s", "u", { fetchImpl: empty })).toBeNull();
  });

  it("returns null when API key is missing", async () => {
    process.env.MISTRAL_API_KEY = "";
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch;
    expect(await chatComplete("s", "u", { fetchImpl })).toBeNull();
    expect(called).toBe(false);
    process.env.MISTRAL_API_KEY = "unit-test-fake-key";
  });
});
