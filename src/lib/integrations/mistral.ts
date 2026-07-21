import { env } from "@/lib/env";

const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";

interface MistralOcrPage {
  markdown?: string;
  text?: string;
}

interface MistralOcrResponse {
  pages?: MistralOcrPage[];
  text?: string;
}

export interface OcrDeps {
  // Injectable for unit tests only — production code always uses global fetch.
  fetchImpl?: typeof fetch;
}

// OCR only produces plain text — no interpretation, classification, or
// structuring (Document OCR add-on §1). "Synchronous request-time process
// where possible" (§4) — no queues, no background pipelines.
// NEVER throws: any failure (missing key, network error, non-2xx, empty
// result) resolves to null so the caller applies the Failure Rule (§9:
// "upload never fails" because OCR failed).
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  deps: OcrDeps = {}
): Promise<string | null> {
  const apiKey = env.mistralApiKey;
  if (!apiKey) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const base64 = buffer.toString("base64");
    const res = await fetchImpl(MISTRAL_OCR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          document_url: `data:${mimeType};base64,${base64}`,
        },
      }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as MistralOcrResponse;
    const fromPages = json.pages
      ?.map((p) => p.markdown ?? p.text ?? "")
      .join("\n")
      .trim();
    const text = fromPages || json.text?.trim() || "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
