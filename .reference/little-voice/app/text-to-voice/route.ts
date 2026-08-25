import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import getMp3Duration from "get-mp3-duration"
import {
  addRequestLog,
  getCachedAudio,
  getSettings,
  listApiKeys,
  listVoices,
  markApiKeyResult,
  setCachedAudio,
} from "@/lib/firestore"
import { callSpeechifyTts, resolveSpeechifyLanguage, SUPPORTED_LANGUAGES } from "@/lib/speechify"
import { formatAudioDuration, formatBDTime } from "@/lib/format"
import { splitTextByLimit } from "@/lib/text-chunk"
import { mergeMp3Buffers } from "@/lib/audio"

function buildCacheKey(text: string, languageCode: string, speaker: string) {
  return createHash("sha256").update(`${text}::${languageCode}::${speaker}`).digest("hex")
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Little Voice API's public request contract. "model" and "audioFormat" are
// intentionally not accepted here — those are fixed Speechify-only parameters
// sent hidden by lib/speechify.ts and are never exposed to or read from callers.
type Body = {
  text?: string
  language_code?: string
  speaker?: string
}

const SPEECHIFY_MODEL_LABEL = "simba-multilingual"

export async function POST(req: Request) {
  const startedAt = Date.now()
  let body: Body

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { text, language_code, speaker } = body

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "'text' is required" }, { status: 400 })
  }
  if (!language_code || typeof language_code !== "string") {
    return NextResponse.json({ error: "'language_code' is required" }, { status: 400 })
  }
  const speechifyLanguageCode = resolveSpeechifyLanguage(language_code)
  if (!speechifyLanguageCode) {
    return NextResponse.json(
      {
        error: `Unsupported 'language_code'. Use one of: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}`,
      },
      { status: 400 },
    )
  }
  if (!speaker || typeof speaker !== "string") {
    return NextResponse.json({ error: "'speaker' is required" }, { status: 400 })
  }

  const trimmedText = text.trim()

  const settings = await getSettings()

  if (trimmedText.length > settings.littleVoiceTextLimit) {
    return NextResponse.json(
      {
        error: `'text' exceeds the configured Little Voice API limit of ${settings.littleVoiceTextLimit} characters`,
        text_length: trimmedText.length,
        limit: settings.littleVoiceTextLimit,
      },
      { status: 413 },
    )
  }

  // Every voice only speaks the languages it was explicitly configured with
  // on the Voices page — reject the request up front rather than sending a
  // language Speechify (or the chosen voice) doesn't actually support.
  let voices
  try {
    voices = await listVoices()
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const voice = voices.find((v) => v.voiceId === speaker)
  if (!voice) {
    return NextResponse.json(
      { error: `Unknown 'speaker'. No configured voice has id '${speaker}'.` },
      { status: 400 },
    )
  }
  if (!voice.languages.includes(language_code as (typeof voice.languages)[number])) {
    return NextResponse.json(
      {
        error: `Voice '${speaker}' does not support language '${language_code}'. It only supports: ${
          voice.languages.length > 0 ? voice.languages.join(", ") : "none configured"
        }.`,
      },
      { status: 400 },
    )
  }

  // Identical text + speaker + language was generated recently — reuse the
  // stored merged audio instead of spending Speechify-billed characters and
  // upstream calls again.
  const cacheKey = buildCacheKey(trimmedText, language_code, speaker)
  const cached = await getCachedAudio(cacheKey).catch(() => null)
  if (cached) {
    await addRequestLog({
      status: "success",
      textPreview: trimmedText.slice(0, 80),
      languageCode: language_code,
      speaker,
      model: SPEECHIFY_MODEL_LABEL,
      keyLabel: null,
      durationMs: Date.now() - startedAt,
      errorMessage: null,
      billableCharacters: 0,
      chunksUsed: cached.chunksUsed,
      cached: true,
    })

    return NextResponse.json({
      request_id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      text: trimmedText,
      audios: [cached.audioBase64],
      audio_durations: [formatAudioDuration(cached.durationMs / 1000)],
      language: language_code,
      chunks_used: cached.chunksUsed,
      billable_characters: 0,
      cached: true,
      time: formatBDTime(),
    })
  }

  let keys
  try {
    keys = (await listApiKeys()).filter((k) => k.active)
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  if (keys.length === 0) {
    return NextResponse.json({ error: "No active API keys configured" }, { status: 503 })
  }

  // Prefer keys that aren't currently rate-limit cooling down, but never
  // block a request entirely just because every active key happens to be
  // cooling down at once — fall back to trying them anyway.
  const now = Date.now()
  const readyKeys = keys.filter((k) => !k.coolingDownUntil || k.coolingDownUntil <= now)
  const orderedKeys = readyKeys.length > 0 ? readyKeys : keys

  // Speechify's /v1/audio/stream rejects any single request above its own
  // hard cap of 20,000 characters; settings.speechifyTextLimit (admin-set on
  // the Settings page, always <= 20,000) is the actual per-chunk size used
  // here so it can be tuned lower without a code change. Long input is split
  // on word boundaries into chunks of that size (never cutting a word in
  // half) and each chunk is sent as its own upstream request — using the
  // same voice/language for every chunk so the merged result sounds like one
  // continuous speaker — rotating through the same active-key pool per chunk
  // until every chunk has audio (if a key fails or is rate-limited, the next
  // active key is tried for that same chunk).
  const chunks = splitTextByLimit(trimmedText, settings.speechifyTextLimit)

  const audioBuffers: Buffer[] = []
  let successKeyLabel: string | null = null
  let totalBillableCharacters = 0
  let lastError: { status: number; message: string } | null = null

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    let chunkSucceeded = false

    for (const key of orderedKeys) {
      const result = await callSpeechifyTts(key.key, {
        text: chunk,
        language: speechifyLanguageCode,
        voiceId: speaker,
      })

      if (result.ok) {
        await markApiKeyResult(key.id, true, { billableCharacters: result.billableCharacters })
        successKeyLabel = key.label
        totalBillableCharacters += result.billableCharacters
        audioBuffers.push(Buffer.from(result.audioBase64, "base64"))
        chunkSucceeded = true
        break
      }

      lastError = { status: result.status, message: result.message }
      await markApiKeyResult(key.id, false, { status: result.status })
    }

    if (!chunkSucceeded) {
      // Stop immediately rather than returning a partial/garbled audio file —
      // log exactly which chunk failed and why, then surface a single clear
      // error to the caller.
      await addRequestLog({
        status: "error",
        textPreview: trimmedText.slice(0, 80),
        languageCode: language_code,
        speaker,
        model: SPEECHIFY_MODEL_LABEL,
        keyLabel: null,
        durationMs: Date.now() - startedAt,
        errorMessage: lastError?.message ?? "All API keys failed",
        billableCharacters: null,
        chunksUsed: chunks.length,
      })

      return NextResponse.json(
        {
          error: "All configured API keys failed to generate speech",
          detail: lastError?.message,
          failed_chunk: i + 1,
          total_chunks: chunks.length,
        },
        { status: 502 },
      )
    }
  }

  // Multiple chunks means multiple independent Speechify audio clips —
  // stitch them into a single continuous MP3 so Little Voice API still
  // returns one audio for the one request the caller made, no matter how
  // many upstream Speechify calls (each bounded by the admin-configured
  // settings.speechifyTextLimit, capped at Speechify's own 20,000-char
  // stream limit) it took.
  const mergedAudio = mergeMp3Buffers(audioBuffers)
  const mergedBase64 = mergedAudio.toString("base64")

  let mergedDurationMs = 0
  try {
    mergedDurationMs = getMp3Duration(mergedAudio)
  } catch {
    mergedDurationMs = 0
  }

  await addRequestLog({
    status: "success",
    textPreview: trimmedText.slice(0, 80),
    languageCode: language_code,
    speaker,
    model: SPEECHIFY_MODEL_LABEL,
    keyLabel: successKeyLabel,
    durationMs: Date.now() - startedAt,
    errorMessage: null,
    billableCharacters: totalBillableCharacters,
    chunksUsed: chunks.length,
  })

  await setCachedAudio(cacheKey, {
    audioBase64: mergedBase64,
    billableCharacters: totalBillableCharacters,
    chunksUsed: chunks.length,
    durationMs: mergedDurationMs,
  }).catch(() => {
    // Caching is a best-effort optimization — never fail the actual request
    // over it (e.g. audio too large for a single Firestore document).
  })

  return NextResponse.json({
    request_id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    text: trimmedText,
    audios: [mergedBase64],
    audio_durations: [formatAudioDuration(mergedDurationMs / 1000)],
    language: language_code,
    chunks_used: chunks.length,
    billable_characters: totalBillableCharacters,
    time: formatBDTime(),
  })
}
