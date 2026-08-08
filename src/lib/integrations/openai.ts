import { env } from "@/lib/env";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const STRUCTURE_TIMEOUT_MS = 15_000;
const DEFAULT_MODEL = "gpt-5.4-mini";

export interface StructureVoiceDeps {
  fetchImpl?: typeof fetch;
  requestId?: string;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const SYSTEM_PROMPT = `Si pomočnik za terensko komunikacijo (pisarna ↔ delavec) v slovenščini.
Tvoje naloge:
- Prepiši surovi prepis govora v jasno, kratko, strukturično sporočilo.
- Obdrži pomen; ne izmišljuj dejstev, imen, številk ali nalog.
- Popravi očitne STT napake le, če je kontekst jasen.
- Odgovori SAMO s končnim sporočilom v slovenščini — brez uvodov, narekovajev ali razlage.
- Če je vhod že jasen, ga le rahlo uredi (ločila, velike začetnice).`;

function logOpenAI(
  requestId: string | undefined,
  message: string,
  extra?: Record<string, unknown>
): void {
  console.error(
    JSON.stringify({
      scope: "openai.structureVoice",
      requestId: requestId ?? null,
      message,
      ...extra,
    })
  );
}

/**
 * Turn raw Slovenian STT text into a clear structural field message.
 * Never throws — returns null on any failure so the caller keeps the raw
 * transcript (Failure Rule: communication must not fail because GPT is down).
 */
export async function structureVoiceTranscript(
  rawTranscript: string,
  deps: StructureVoiceDeps = {}
): Promise<string | null> {
  const trimmed = rawTranscript.trim();
  if (!trimmed) return null;

  const apiKey = env.openaiApiKey;
  if (!apiKey) {
    logOpenAI(deps.requestId, "OpenAI API key is missing");
    return null;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STRUCTURE_TIMEOUT_MS);

  try {
    const res = await fetchImpl(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openaiVoiceModel || DEFAULT_MODEL,
        temperature: 0.2,
        // gpt-5.4-mini rejects max_tokens — requires max_completion_tokens.
        max_completion_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Surovi prepis (STT):\n${trimmed}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logOpenAI(deps.requestId, "OpenAI API error", {
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const json = (await res.json()) as OpenAIChatResponse;
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      logOpenAI(deps.requestId, "OpenAI returned an empty structure");
      return null;
    }
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logOpenAI(deps.requestId, "Voice structure request failed", { error: message });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
