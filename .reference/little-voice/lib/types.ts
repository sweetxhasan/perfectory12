export type SpeechifyApiKey = {
  id: string
  label: string
  key: string
  active: boolean
  createdAt: number
  lastUsedAt: number | null
  successCount: number
  errorCount: number
  // Total Speechify-billed characters attributed to this specific key across
  // every successful chunk it ever generated audio for.
  charactersBilled: number
  // Set when this key gets rate-limited (HTTP 429) by Speechify. The request
  // loop skips a key while now < coolingDownUntil, falling back to it only if
  // every other active key is also cooling down. Null when not cooling down.
  coolingDownUntil: number | null
}

export type VoiceType = "free" | "pro" | "pro-max"

// Short language codes Little Voice API exposes publicly. A voice can speak
// one or more of these — /text-to-voice validates the requested language
// against the chosen voice's own `languages` list.
export type VoiceLanguage = "en" | "bn" | "hi"

export type Voice = {
  id: string
  name: string
  voiceId: string
  gender: "male" | "female"
  voiceType: VoiceType
  photoUrl: string
  sampleAudioUrl: string
  // Every language this voice can speak, e.g. ["en", "hi"].
  languages: VoiceLanguage[]
  createdAt: number
}

export type ApiSettings = {
  // Max characters Little Voice API accepts from a caller in a single request.
  littleVoiceTextLimit: number
  // Max characters sent to Speechify per upstream request. Text longer than
  // this is split on word boundaries into multiple Speechify requests and the
  // resulting audio is merged back into one file. Speechify's own hard cap is
  // 2000 characters per request.
  speechifyTextLimit: number
}

export type RequestLog = {
  id: string
  createdAt: number
  status: "success" | "error"
  textPreview: string
  languageCode: string
  speaker: string
  model: string
  keyLabel: string | null
  durationMs: number
  errorMessage: string | null
  // Total characters Speechify billed for this request, summed across every
  // chunk when the text was split. Null for older logs / failures with no
  // billable usage.
  billableCharacters: number | null
  // How many upstream Speechify calls this request was split into.
  chunksUsed: number | null
  // True when this request was served entirely from the audio cache without
  // calling Speechify at all. Undefined/absent on older logs.
  cached?: boolean
}
