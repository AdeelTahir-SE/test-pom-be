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

// OCR only produces plain text. Document Classification & Preview (Add-on 1)
// runs separately after a successful extraction. "Synchronous request-time
// process where possible" (§4) — no queues, no background pipelines.
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

const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";

export interface ChatDeps {
  fetchImpl?: typeof fetch;
}

interface MistralChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Add-on 3 — short chat completion for daily operational summarization.
 * Returns null on any failure (missing key, network, empty) so callers never
 * persist a partial/empty historical snapshot.
 */
export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  deps: ChatDeps = {}
): Promise<string | null> {
  const apiKey = env.mistralApiKey;
  if (!apiKey) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(MISTRAL_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as MistralChatResponse;
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
