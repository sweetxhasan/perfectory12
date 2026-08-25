"use client"

import { useMemo, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { GlassPanel } from "@/components/glass-panel"
import { OutputPlayer } from "@/components/output-player"
import { VoiceChipSelect } from "@/components/voice-chip-select"
import { useVoices } from "@/lib/hooks"
import type { Voice } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Mic2, Sparkles, Languages } from "lucide-react"
import { cn } from "@/lib/utils"

const LANGUAGES = [
  { code: "hi", label: "Hindi", full: "Hindi (hi-IN)" },
  { code: "en", label: "English", full: "English (en-US)" },
  { code: "bn", label: "Bengali", full: "Bengali (bn-IN)" },
]

// Small text-label filter next to the Voice label — lets the admin narrow
// the horizontally-scrolling voice row down to one gender without taking
// up label-row space on narrow screens.
const GENDER_FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
]

// Shown as the starting text whenever the admin switches language — gives
// an instant, in-language sample to generate without having to type
// anything first. Swapped out automatically only while the admin hasn't
// typed their own text yet (see the language button's onClick below).
const DEMO_TEXT: Record<string, string> = {
  hi: "नमस्ते! Little Voice API में आपका स्वागत है। हम हर language को voice देते हैं।",
  en: "Hello! Welcome to Little Voice API. We turn your text into natural-sounding speech in seconds.",
  bn: "নমস্কার! Little Voice API-এ আপনাকে স্বাগতম। আমরা আপনার লেখাকে প্রাকৃতিক কণ্ঠে রূপান্তর করি।",
}

export default function GeneratorPage() {
  const { data: voices } = useVoices()
  const [text, setText] = useState(DEMO_TEXT.hi)
  const [textEdited, setTextEdited] = useState(false)
  const [language, setLanguage] = useState("hi")
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all")
  const [speaker, setSpeaker] = useState("")
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<{
    text: string
    time: string
    language: string
    audioDuration: string
  } | null>(null)

  // Only voices configured (on the Voices page) to speak the currently
  // selected language are offered here — matches the same check
  // /text-to-voice enforces server-side. The gender filter narrows that
  // list further on top, purely client-side.
  const languageVoices = useMemo<Voice[]>(
    () => (voices ?? []).filter((v) => v.languages.includes(language as Voice["languages"][number])),
    [voices, language],
  )
  const activeVoices = useMemo<Voice[]>(
    () => (genderFilter === "all" ? languageVoices : languageVoices.filter((v) => v.gender === genderFilter)),
    [languageVoices, genderFilter],
  )

  async function handleGenerate() {
    if (!text.trim()) {
      toast.error("Enter some text first")
      return
    }
    const chosenSpeaker = speaker || activeVoices[0]?.voiceId
    if (!chosenSpeaker) {
      toast.error("Add at least one voice on the Voices page")
      return
    }
    setLoading(true)
    setAudioUrl(null)
    try {
      const res = await fetch("/text-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language_code: language,
          speaker: chosenSpeaker,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Generation failed")
      const audioBase64: string = data.audios?.[0]
      if (!audioBase64) throw new Error("No audio returned")
      const blob = base64ToBlob(audioBase64, "audio/mpeg")
      setAudioUrl(URL.createObjectURL(blob))
      setMeta({
        text: data.text ?? text,
        time: data.time,
        language: data.language ?? language,
        audioDuration: data.audio_durations?.[0] ?? "—",
      })
      toast.success("Voice generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Voice Generator"
        description="Test text-to-speech output live using your configured voices before wiring the API into your product."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <GlassPanel className="flex flex-col gap-6 p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="text" className="font-serif text-sm text-foreground">
                Text to convert
              </label>
              <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {text.length} chars
              </span>
            </div>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setTextEdited(true)
              }}
              rows={5}
              placeholder="Type or paste text in any supported language..."
              // field-sizing-content (from the base Textarea) grows the box
              // to fit every new line, which on a phone can push the
              // generate button off screen — max-h + overflow-y-auto caps
              // the growth and lets long text scroll inside the box instead.
              className="max-h-56 min-h-32 resize-none overflow-y-auto rounded-2xl border-border bg-card/60 font-sans text-[15px] leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-serif text-sm text-foreground">
              <Languages className="h-3.5 w-3.5 text-primary" />
              Language
            </span>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
              {LANGUAGES.map((l) => {
                const active = l.code === language
                return (
                  <button
                    key={l.code}
                    type="button"
                    title={l.full}
                    aria-pressed={active}
                    onClick={() => {
                      setLanguage(l.code)
                      // The previously selected voice may not speak the
                      // newly chosen language — clear it so the picker
                      // falls back to the first voice that supports it.
                      setSpeaker("")
                      // Only swap in the new language's demo text while the
                      // admin hasn't typed their own — once they've edited
                      // it, switching language shouldn't erase their work.
                      if (!textEdited) setText(DEMO_TEXT[l.code] ?? "")
                    }}
                    className={cn(
                      "rounded-xl px-2 py-2.5 font-sans text-xs font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_6px_18px_-6px_oklch(0.64_0.2_290_/_55%)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-serif text-sm text-foreground">
                <Mic2 className="h-3.5 w-3.5 text-primary" />
                Voice
              </span>
              <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-1">
                {GENDER_FILTERS.map(({ value, label }) => {
                  const active = genderFilter === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setGenderFilter(value)
                        // The previously selected voice may not match the
                        // new filter — clear it so the picker falls back to
                        // the first voice that does.
                        setSpeaker("")
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1 font-sans text-[11px] font-medium leading-none transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_4px_10px_-3px_oklch(0.64_0.2_290_/_60%)]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <VoiceChipSelect
              voices={activeVoices}
              value={speaker || activeVoices[0]?.voiceId || ""}
              onChange={setSpeaker}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-[15px] text-primary-foreground shadow-[0_14px_34px_-10px_oklch(0.64_0.2_290_/_60%)] transition-transform duration-200 hover:scale-[1.01] sm:h-11 sm:w-auto sm:self-start sm:px-6 sm:text-sm"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4 animate-icon-glow-pulse" />
            )}
            {loading ? "Generating..." : "Generate voice"}
          </Button>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-accent/30 to-primary/15 text-accent-foreground">
              <Mic2 className="size-4" />
            </div>
            <h3 className="font-serif text-lg text-foreground">Output</h3>
          </div>

          {!audioUrl && !loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Your generated audio will appear here, ready to play or download.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Contacting voice engine...</p>
            </div>
          )}

          {audioUrl && !loading && (
            <div className="flex flex-col gap-5">
              <OutputPlayer key={audioUrl} src={audioUrl} downloadHref={audioUrl} />

              {meta && (
                <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Text</p>
                    <p className="line-clamp-2 font-mono text-xs text-foreground">{meta.text}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MetaChip label="Language" value={meta.language} />
                    <MetaChip label="Duration" value={meta.audioDuration} />
                    <MetaChip label="Time (BD)" value={meta.time} />
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </DashboardShell>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <span className="font-sans text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  )
}

function base64ToBlob(base64: string, contentType: string) {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: contentType })
}
