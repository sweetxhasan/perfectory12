"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { slugifyVoiceId } from "@/lib/slug"
import { getVoiceAvatar } from "@/lib/avatar"
import { LANGUAGE_OPTIONS, ALL_VOICE_LANGUAGES } from "@/lib/voice-languages"
import type { Voice, VoiceLanguage, VoiceType } from "@/lib/types"
import { cn } from "@/lib/utils"

export type VoiceFormValues = {
  name: string
  voiceId: string
  gender: "male" | "female"
  voiceType: VoiceType
  photoUrl: string
  sampleAudioUrl: string
  languages: VoiceLanguage[]
}

type VoiceFormDialogProps = {
  mode: "add" | "edit"
  voice?: Voice | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The trigger element (e.g. a Button) to render — its children become the dialog trigger's label/icon. */
  trigger?: ReactElement
  triggerContent?: ReactNode
  onSubmit: (values: VoiceFormValues) => Promise<void>
}

export function VoiceFormDialog({
  mode,
  voice,
  open,
  onOpenChange,
  trigger,
  triggerContent,
  onSubmit,
}: VoiceFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [name, setName] = useState("")
  const [voiceId, setVoiceId] = useState("")
  const [voiceIdEdited, setVoiceIdEdited] = useState(false)
  const [gender, setGender] = useState<"male" | "female">("female")
  const [voiceType, setVoiceType] = useState<VoiceType>("free")
  const [sampleAudioUrl, setSampleAudioUrl] = useState("")
  const [languages, setLanguages] = useState<VoiceLanguage[]>(ALL_VOICE_LANGUAGES)
  const [submitting, setSubmitting] = useState(false)
  const [sampleCheck, setSampleCheck] = useState<{ status: "idle" | "checking" | "valid" | "invalid"; url: string }>({
    status: "idle",
    url: "",
  })
  const validationAudioRef = useRef<HTMLAudioElement | null>(null)

  // Prefill (edit) or reset (add) every field whenever the dialog opens, so
  // switching which voice is being edited — or reopening "Add" after a
  // previous save — never leaks stale values from the last time it was open.
  useEffect(() => {
    if (!isOpen) return
    if (mode === "edit" && voice) {
      setName(voice.name)
      setVoiceId(voice.voiceId)
      setVoiceIdEdited(true)
      setGender(voice.gender)
      setVoiceType(voice.voiceType)
      setSampleAudioUrl(voice.sampleAudioUrl)
      setLanguages(voice.languages.length > 0 ? voice.languages : ALL_VOICE_LANGUAGES)
    } else {
      setName("")
      setVoiceId("")
      setVoiceIdEdited(false)
      setGender("female")
      setVoiceType("free")
      setSampleAudioUrl("")
      setLanguages(ALL_VOICE_LANGUAGES)
    }
    setSampleCheck({ status: "idle", url: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, voice?.id])

  // Voice id auto-follows the name as a slug until the admin manually edits
  // it — after that, typing the name no longer overwrites their choice. This
  // is driven directly from the name input's onChange (not a useEffect keyed
  // on `name`) so it can never race with the prefill effect above, which
  // sets voiceId + voiceIdEdited together when opening in edit mode.
  function handleNameChange(value: string) {
    setName(value)
    if (!voiceIdEdited) setVoiceId(slugifyVoiceId(value))
  }

  const avatarPreview = getVoiceAvatar(name || voiceId, gender)

  function setLanguageChecked(code: VoiceLanguage, checked: boolean) {
    setLanguages((prev) => {
      const has = prev.includes(code)
      // Always keep at least one language checked — a voice with zero
      // languages could never be matched by /text-to-voice.
      if (!checked && has && prev.length === 1) return prev
      if (checked === has) return prev
      return checked ? [...prev, code] : prev.filter((l) => l !== code)
    })
  }

  function testSampleAudio() {
    const url = sampleAudioUrl.trim()
    if (!url) return
    validationAudioRef.current?.pause()
    setSampleCheck({ status: "checking", url })
    const audio = new Audio(url)
    audio.oncanplaythrough = () => setSampleCheck({ status: "valid", url })
    audio.onerror = () => setSampleCheck({ status: "invalid", url })
    validationAudioRef.current = audio
    audio.load()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const finalVoiceId = slugifyVoiceId(voiceId)
    if (!name.trim() || !finalVoiceId || languages.length === 0) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        voiceId: finalVoiceId,
        gender,
        voiceType,
        photoUrl: avatarPreview,
        sampleAudioUrl: sampleAudioUrl.trim(),
        languages,
      })
      setOpen(false)
    } catch {
      toast.error(mode === "add" ? "Could not add voice" : "Could not update voice")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger}>{triggerContent}</DialogTrigger>}
      <DialogContent className="glass-strong rounded-3xl border border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {mode === "add" ? "Add a new voice" : "Edit voice"}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {mode === "add"
              ? "This voice will appear in the generator's speaker selector for admin testing."
              : "Update this voice's details. Changes apply immediately to the generator and public API."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex items-center gap-4">
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10">
              <Image
                key={avatarPreview}
                src={avatarPreview || "/placeholder.svg"}
                alt="Auto-generated character avatar preview"
                fill
                unoptimized
                className="object-cover"
              />
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-xs uppercase tracking-[0.1em] text-muted-foreground">
                Character avatar
              </span>
              <span className="font-sans text-sm text-foreground">Assigned automatically</span>
              <span className="font-sans text-xs text-muted-foreground">
                Generated live from a premium avatar CDN based on name + gender. No upload needed.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="font-sans text-xs">
              Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Hasan"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="font-sans"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="voiceId" className="font-sans text-xs">
              Voice id
            </Label>
            <Input
              id="voiceId"
              placeholder="auto-generated-from-name"
              value={voiceId}
              onChange={(e) => {
                setVoiceIdEdited(true)
                setVoiceId(e.target.value)
              }}
              className="font-mono text-sm"
              required
            />
            <p className="font-sans text-xs text-muted-foreground">
              Auto-typed from the name — edit it any time, before or after saving, if you want a different id.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="font-sans text-xs">Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                <SelectTrigger className="w-full font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="font-sans text-xs">Voice type</Label>
              <Select value={voiceType} onValueChange={(v) => setVoiceType(v as VoiceType)}>
                <SelectTrigger className="w-full font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="pro-max">Pro Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="font-sans text-xs">Languages</Label>
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {LANGUAGE_OPTIONS.map((l) => {
                const checked = languages.includes(l.code)
                return (
                  <label
                    key={l.code}
                    htmlFor={`lang-${l.code}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-white/5",
                    )}
                  >
                    <Checkbox
                      id={`lang-${l.code}`}
                      checked={checked}
                      onCheckedChange={(v) => setLanguageChecked(l.code, Boolean(v))}
                    />
                    <span className="font-sans text-sm text-foreground">{l.label}</span>
                  </label>
                )
              })}
            </div>
            <p className="font-sans text-xs text-muted-foreground">
              /text-to-voice only accepts requests for this voice in a checked language. At least one must stay
              checked.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sampleAudioUrl" className="font-sans text-xs">
              Character voice url (sample)
            </Label>
            <div className="flex gap-2">
              <Input
                id="sampleAudioUrl"
                placeholder="https://example.com/sample.mp3"
                value={sampleAudioUrl}
                onChange={(e) => {
                  setSampleAudioUrl(e.target.value)
                  setSampleCheck({ status: "idle", url: "" })
                }}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!sampleAudioUrl.trim() || sampleCheck.status === "checking"}
                onClick={testSampleAudio}
                className="shrink-0 rounded-xl border-white/10 bg-white/5 font-sans text-xs"
              >
                {sampleCheck.status === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </Button>
            </div>
            {sampleCheck.status === "valid" && sampleCheck.url === sampleAudioUrl.trim() && (
              <span className="flex items-center gap-1.5 font-sans text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Audio plays correctly
              </span>
            )}
            {sampleCheck.status === "invalid" && sampleCheck.url === sampleAudioUrl.trim() && (
              <span className="flex items-center gap-1.5 font-sans text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" /> Could not load audio from this URL
              </span>
            )}
          </div>

          <DialogFooter className="!mx-0 !mb-0 rounded-none border-none !bg-transparent !p-0">
            <Button
              type="submit"
              disabled={submitting || languages.length === 0}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-primary-foreground hover:scale-[1.02]"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "add" ? "Save voice" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
