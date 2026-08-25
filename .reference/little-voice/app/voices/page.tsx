"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Mic2, Pencil, Plus, Trash2, User, Users } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { GlassPanel } from "@/components/glass-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceFormDialog, type VoiceFormValues } from "@/components/voice-form-dialog"
import { VoiceSampleButton } from "@/components/voice-sample-button"
import { useVoices } from "@/lib/hooks"
import { addVoice, deleteVoice, updateVoice } from "@/lib/firestore"
import { LANGUAGE_OPTIONS, LANGUAGE_LABEL } from "@/lib/voice-languages"
import type { Voice, VoiceLanguage, VoiceType } from "@/lib/types"
import { cn } from "@/lib/utils"

const VOICE_TYPE_LABEL: Record<VoiceType, string> = {
  free: "Free",
  pro: "Pro",
  "pro-max": "Pro Max",
}

const VOICE_TYPE_BADGE_CLASS: Record<VoiceType, string> = {
  free: "border-white/10 bg-white/5 text-muted-foreground",
  pro: "border-blue-400/30 bg-blue-500/15 text-blue-300",
  "pro-max": "border-transparent bg-gradient-to-r from-primary to-accent text-primary-foreground",
}

export default function VoicesPage() {
  const { data: voices, isLoading, mutate } = useVoices()
  const [addOpen, setAddOpen] = useState(false)
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null)
  const [languageFilter, setLanguageFilter] = useState<VoiceLanguage | "all">("all")

  const filteredVoices = useMemo(
    () => (voices ?? []).filter((v) => languageFilter === "all" || v.languages.includes(languageFilter)),
    [voices, languageFilter],
  )

  async function handleAdd(values: VoiceFormValues) {
    await addVoice(values)
    await mutate()
    toast.success("Voice added", { description: values.name })
  }

  async function handleEdit(values: VoiceFormValues) {
    if (!editingVoice) return
    await updateVoice(editingVoice.id, values)
    await mutate()
    toast.success("Voice updated", { description: values.name })
  }

  async function handleDelete(id: string) {
    await deleteVoice(id)
    await mutate()
    toast.success("Voice removed")
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Voices"
        description="Add and curate the voices available in the generator and testing tools. Each voice maps directly to a Speechify voiceId and declares which languages it can speak."
        action={
          <VoiceFormDialog
            mode="add"
            open={addOpen}
            onOpenChange={setAddOpen}
            onSubmit={handleAdd}
            trigger={
              <Button className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-primary-foreground shadow-[0_10px_28px_-10px_oklch(0.64_0.2_290_/_55%)] hover:scale-[1.02]" />
            }
            triggerContent={
              <>
                <Plus className="h-4 w-4" />
                Add voice
              </>
            }
          />
        }
      />

      {editingVoice && (
        <VoiceFormDialog
          mode="edit"
          voice={editingVoice}
          open={Boolean(editingVoice)}
          onOpenChange={(v) => {
            if (!v) setEditingVoice(null)
          }}
          onSubmit={handleEdit}
        />
      )}

      {!isLoading && voices && voices.length > 0 && (
        <Tabs value={languageFilter} onValueChange={(v) => v && setLanguageFilter(v as VoiceLanguage | "all")}>
          <TabsList variant="line" className="h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className="font-sans text-xs">
              All
            </TabsTrigger>
            {LANGUAGE_OPTIONS.map((l) => (
              <TabsTrigger key={l.code} value={l.code} className="font-sans text-xs">
                {l.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredVoices.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVoices.map((v) => (
            <GlassPanel
              key={v.id}
              className="flex flex-col gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                    {v.photoUrl ? (
                      <Image
                        src={v.photoUrl || "/placeholder.svg"}
                        alt={v.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Mic2 className="h-5 w-5" />
                    )}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-base font-semibold text-foreground">{v.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">id: {v.voiceId}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {v.sampleAudioUrl && <VoiceSampleButton url={v.sampleAudioUrl} />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditingVoice(v)}
                    className="h-9 w-9 text-foreground hover:bg-primary/15 hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit {v.name}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(v.id)}
                    className="h-9 w-9 text-destructive hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete {v.name}</span>
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-white/10 bg-white/5 font-sans text-xs">
                  {v.gender === "male" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                  {v.gender === "male" ? "Male" : "Female"}
                </Badge>
                <Badge variant="outline" className={cn("font-sans text-xs", VOICE_TYPE_BADGE_CLASS[v.voiceType])}>
                  {VOICE_TYPE_LABEL[v.voiceType]}
                </Badge>
                {v.languages.map((code) => (
                  <Badge key={code} variant="outline" className="border-white/10 bg-white/5 font-sans text-xs">
                    {LANGUAGE_LABEL[code]}
                  </Badge>
                ))}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
            <Mic2 className="h-6 w-6" />
          </span>
          <p className="max-w-sm font-sans text-sm text-muted-foreground">
            {voices && voices.length > 0
              ? "No voices support this language yet. Try a different filter or add one on the Voices page."
              : "No voices added yet. Add a voice to make it available in the generator."}
          </p>
        </GlassPanel>
      )}
    </DashboardShell>
  )
}
