// /v1/audio/stream accepts up to 20,000 characters per request (vs. 2,000 on
// /v1/audio/speech), so it's used here to cut the number of upstream calls
// needed for long text by ~10x. The tradeoff: stream returns raw audio bytes
// over HTTP instead of a JSON envelope with base64 audio + billing metadata,
// which callSpeechifyTts below accounts for.
const SPEECHIFY_TTS_ENDPOINT = "https://api.speechify.ai/v1/audio/stream"

// Little Voice API accepts short language codes from callers and forwards the
// full Speechify locale code upstream, e.g. "bn" -> "bn-IN". Same mapping is
// used for both Speechify and Little Voice API requests.
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "en-US",
  bn: "bn-IN",
  hi: "hi-IN",
}

export function resolveSpeechifyLanguage(code: string): string | null {
  return SUPPORTED_LANGUAGES[code] ?? null
}

// Rotate through real desktop/mobile browser user agents so upstream traffic
// looks like normal client usage instead of a single static server signature.
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Edg/126.0.0.0",
]

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// These are fixed upstream Speechify parameters. They are intentionally NOT
// part of the public Little Voice API request contract (SpeechifyTtsRequest
// below) — callers never see or set them, they're only ever sent hidden to
// Speechify.
const SPEECHIFY_MODEL = "simba-multilingual"
// The stream endpoint has no "audio_format" field (that's speech-only) — mp3
// output is instead selected via "output_format" as a codec_rate_bitrate
// string, or omitted entirely in favor of the Accept header. We set it
// explicitly so the response Content-Type/codec never depends on defaults.
const SPEECHIFY_OUTPUT_FORMAT = "mp3_24000_128"

export type SpeechifyTtsRequest = {
  text: string
  // Full Speechify locale, e.g. "bn-IN" — already resolved via
  // resolveSpeechifyLanguage before this is called.
  language: string
  // Speechify voiceId, e.g. "geffen_32". Maps 1:1 to Little Voice API's
  // "speaker" field.
  voiceId: string
}

export type SpeechifyTtsSuccess = {
  ok: true
  audioBase64: string
  audioFormat: string
  billableCharacters: number
}

export type SpeechifyTtsFailure = {
  ok: false
  status: number
  message: string
}

export async function callSpeechifyTts(
  apiKey: string,
  payload: SpeechifyTtsRequest,
): Promise<SpeechifyTtsSuccess | SpeechifyTtsFailure> {
  try {
    const res = await fetch(SPEECHIFY_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": randomUserAgent(),
        // Errors still come back as JSON on non-2xx; success comes back as
        // raw audio bytes regardless of this header on the stream endpoint.
        Accept: "application/json",
      },
      body: JSON.stringify({
        input: payload.text,
        voice_id: payload.voiceId,
        output_format: SPEECHIFY_OUTPUT_FORMAT,
        model: SPEECHIFY_MODEL,
        language: payload.language,
        options: { text_normalization: true },
      }),
      // Keep the connection warm across the burst of upstream calls that a
      // single high-throughput request loop can generate.
      keepalive: true,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      let message = body || `Speechify request failed with status ${res.status}`
      try {
        // Speechify's standard error envelope is
        // { error: { code, message, fields? }, request_id }.
        const parsed = JSON.parse(body) as {
          error?: { code?: string; message?: string; fields?: Record<string, string> }
        }
        const fieldErrors = parsed?.error?.fields
          ? Object.entries(parsed.error.fields)
              .map(([field, detail]) => `${field}: ${detail}`)
              .join("; ")
          : ""
        message = [parsed?.error?.message, fieldErrors].filter(Boolean).join(" — ") || message
      } catch {
        // body wasn't JSON, keep the raw text/message above
      }
      return { ok: false, status: res.status, message }
    }

    // /v1/audio/stream has no JSON envelope on success — it returns the raw
    // audio bytes directly (HTTP chunked) and carries no billing metadata,
    // so billable characters are estimated from the input length instead.
    const arrayBuffer = await res.arrayBuffer()
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64")

    return {
      ok: true,
      audioBase64,
      audioFormat: "mp3",
      billableCharacters: payload.text.length,
    }
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : "Unknown network error" }
  }
}
