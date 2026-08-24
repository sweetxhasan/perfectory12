import type { VoiceLanguage } from "@/lib/types"

// Single source of truth for every language Little Voice API exposes. Add a
// new language here and the add/edit form, filters, and docs all pick it up.
export const LANGUAGE_OPTIONS: { code: VoiceLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "Bangla" },
  { code: "hi", label: "Hindi" },
]

export const LANGUAGE_LABEL: Record<VoiceLanguage, string> = {
  en: "English",
  bn: "Bangla",
  hi: "Hindi",
}

// Every voice defaults to supporting all languages unless the admin
// unchecks some in the add/edit form.
export const ALL_VOICE_LANGUAGES: VoiceLanguage[] = LANGUAGE_OPTIONS.map((l) => l.code)
