import { env } from "@/lib/env";

// Deepgram Nova-3, model/provider fixed (Voice-to-Text add-on §4: "no
// alternative providers"). Language was originally hardcoded to Slovenian
// per that same section, but is deliberately made dynamic here (per explicit
// request) via Deepgram's own language detection, since workers may speak
// languages other than Slovenian and a locked model mangles anything else.
const QUERY = "model=nova-3&detect_language=true&punctuate=true&smart_format=true&diarize=false";

interface DeepgramResponse {
  results?: {
    channels?: {
      alternatives?: { transcript?: string }[];
    }[];
  };
}

export interface TranscribeDeps {
  // Injectable for unit tests only — production code always uses global fetch.
  fetchImpl?: typeof fetch;
}

// Synchronous HTTP request only (§6 Processing Model: UPLOAD -> TRANSCRIBE ->
// STORE -> RETURN RESPONSE; no streaming, no queues, no retries here).
// NEVER throws: on any failure (missing key, network error, non-2xx, empty
// transcript) this resolves to null so the caller applies the mandatory
// fallback content (§7 Failure Rule — communication must never fail because
// an external provider is unavailable).
export async function transcribeAudio(
  buffer: Buffer,
  contentType: string,
  deps: TranscribeDeps = {}
): Promise<string | null> {
  const apiKey = env.deepgramApiKey;
  if (!apiKey) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${env.deepgramApiUrl}?${QUERY}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": contentType,
      },
      body: Uint8Array.from(buffer),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as DeepgramResponse;
    const transcript = json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    return transcript && transcript.length > 0 ? transcript : null;
  } catch {
    return null;
  }
}
