import { randomUUID } from "crypto";
import { env } from "@/lib/env";

// Deepgram Nova-3 with language detection restored for mixed field speech.
const QUERY =
  "model=nova-3&language=sl&punctuate=true&smart_format=true&diarize=false";

// Maximum time to wait for a Deepgram transcription request.
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

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
  // Optional correlation id for parallel-request log tracing (§4).
  requestId?: string;
}

function isAllowedAudioContentType(contentType: string): boolean {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return base.startsWith("audio/");
}

function logDeepgram(
  requestId: string,
  message: string,
  extra?: Record<string, unknown>
): void {
  // No Sentry in this codebase yet — structured console logs keep the
  // graceful null fallback while giving ops something to grep (§2).
  console.error(
    JSON.stringify({
      scope: "deepgram.transcribe",
      requestId,
      message,
      ...extra,
    })
  );
}

// Single-shot HTTP request (non-streaming, non-queued).
// Per §6 Processing Model: UPLOAD -> TRANSCRIBE -> STORE -> RETURN RESPONSE.
// Per §7 Failure Rule: never throws; returns null on any failure so the
// caller applies the mandatory fallback content.
export async function transcribeAudio(
  buffer: Buffer,
  contentType: string,
  deps: TranscribeDeps = {}
): Promise<string | null> {
  const requestId = deps.requestId ?? randomUUID();

  const apiKey = env.deepgramApiKey;
  if (!apiKey) {
    logDeepgram(requestId, "Deepgram API key is missing");
    return null;
  }

  if (buffer.byteLength === 0) {
    logDeepgram(requestId, "Audio buffer is empty, skipping transcription");
    return null;
  }

  if (!isAllowedAudioContentType(contentType)) {
    logDeepgram(requestId, "Unsupported audio Content-Type, skipping transcription", {
      contentType,
    });
    return null;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const res = await fetchImpl(`${env.deepgramApiUrl}?${QUERY}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": contentType,
        "X-Request-Id": requestId,
      },
      // Pass Buffer directly — no Uint8Array.from() clone (§3).
      // DOM BodyInit typings omit Node Buffer; runtime fetch accepts it.
      body: buffer as unknown as BodyInit,
      signal: controller.signal,
    });

    if (!res.ok) {
      logDeepgram(requestId, "Deepgram API error", {
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const json = (await res.json()) as DeepgramResponse;
    const transcript =
      json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

    if (!transcript) {
      logDeepgram(requestId, "Deepgram returned an empty transcript");
      return null;
    }

    return transcript;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logDeepgram(requestId, "Transcription request failed", { error: message });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
