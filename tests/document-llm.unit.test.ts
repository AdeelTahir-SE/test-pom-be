import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractDocumentFieldsWithLlm } from "@/lib/documents/llmExtract";
import { enrichDocumentFromText, extractDocumentFieldsWithRegex } from "@/lib/documents/preview";

const ORIGINAL_KEY = process.env.MISTRAL_API_KEY;

const sampleInvoice = [
  "Račun št.: 0011/2013",
  "Izdano: Ljubljana, 23.03.2013",
  "Plačano po predračunu.",
  "Podjetje d.o.o.",
  "Srednja cesta 12",
  "1000 Ljubljana",
  "Smokva d.o.o.",
  "Zali log 15",
  "8290 Sevnica",
  "|   |   |   |   |   | Znesek za plačilo: | 2.988,00€  |",
].join("\n");

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

describe("document LLM extraction", () => {
  it("parses and validates structured LLM JSON", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                document_type: "invoice",
                document_number: "0011/2013",
                customer_name: "Smokva d.o.o.",
                date: "2013-03-23",
                amount: "2.988,00€",
                title: null,
                confidence: {
                  document_type: 0.99,
                  document_number: 0.95,
                  customer_name: 0.9,
                  date: 0.9,
                  amount: 0.98,
                },
              }),
            },
          },
        ],
      })) as unknown as typeof fetch;

    const fields = await extractDocumentFieldsWithLlm(sampleInvoice, "99c.png", "image", { fetchImpl });
    expect(fields).toMatchObject({
      document_type: "invoice",
      document_number: "0011/2013",
      customer_name: "Smokva d.o.o.",
      date: "23.03.2013",
      amount: "2.988,00€",
      source: "llm",
    });
  });

  it("rejects hallucinated field values not present in source text", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                document_type: "invoice",
                document_number: "INV-DOES-NOT-EXIST",
                customer_name: "Missing Customer Ltd",
                date: "01.01.2025",
                amount: "999,99€",
                title: null,
                confidence: {},
              }),
            },
          },
        ],
      })) as unknown as typeof fetch;

    const fields = await extractDocumentFieldsWithLlm(sampleInvoice, "99c.png", "image", { fetchImpl });
    expect(fields?.document_number).toBeNull();
    expect(fields?.customer_name).toBeNull();
    expect(fields?.date).toBeNull();
    expect(fields?.amount).toBeNull();
  });

  it("falls back to regex and handles the logged Slovenian invoice sample", async () => {
    process.env.MISTRAL_API_KEY = "";
    const result = await enrichDocumentFromText(sampleInvoice, "99c.png", { attachmentType: "image" });
    expect(result.document_type).toBe("invoice");
    expect(result.document_preview.split("\n")).toEqual([
      "Račun 0011/2013",
      "Smokva d.o.o.",
      "23.03.2013",
      "2.988,00€",
    ]);
    process.env.MISTRAL_API_KEY = "unit-test-fake-key";
  });

  it("does not let predračun payment context override a clear invoice", () => {
    const fields = extractDocumentFieldsWithRegex(sampleInvoice, "99c.png");
    expect(fields.document_type).toBe("invoice");
  });

  it("prompts the LLM to classify Predračun headings as offer", async () => {
    const predRacun = [
      "Datum računa: 9.3.2020. 14:49",
      "Rok plaćanja: 23.3.2020.",
      "## Predračun # 3",
      "| Naziv | Količina | Cijena | Ukupno |",
      "**Ukupno za platiti: 32 985,00 kn**",
      "Operater / Račun izdao: [Operater / Račun izdao]",
    ].join("\n");
    let requestBody: { messages?: Array<{ role: string; content: string }> } | undefined;
    const fetchImpl = (async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      requestBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                document_type: "offer",
                document_number: "3",
                customer_name: null,
                date: "2020-03-09",
                amount: "32 985,00 kn",
                title: "Predračun # 3",
                confidence: {},
              }),
            },
          },
        ],
      });
    }) as unknown as typeof fetch;

    const fields = await extractDocumentFieldsWithLlm(predRacun, "3.pdf", "pdf", { fetchImpl });
    expect(fields?.document_type).toBe("offer");
    const systemPrompt = requestBody?.messages?.find(
      (message: { role: string; content: string }) => message.role === "system"
    )?.content ?? "";
    expect(systemPrompt).toContain("document_type must be offer");
    expect(systemPrompt).toContain("Datum računa");
    expect(systemPrompt).toContain("Račun izdao");
  });
});
