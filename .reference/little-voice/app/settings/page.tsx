"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Loader2, Save, Settings2, SlidersHorizontal } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { GlassPanel } from "@/components/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings } from "@/lib/hooks"
import { updateSettings } from "@/lib/firestore"

export default function SettingsPage() {
  const { data: settings, isLoading, mutate } = useSettings()
  const [littleVoiceLimit, setLittleVoiceLimit] = useState("")
  const [speechifyLimit, setSpeechifyLimit] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setLittleVoiceLimit(String(settings.littleVoiceTextLimit))
      setSpeechifyLimit(String(settings.speechifyTextLimit))
    }
  }, [settings])

  async function handleSave(e: FormEvent) {
    e.preventDefault()

    const littleVoiceTextLimit = Number.parseInt(littleVoiceLimit, 10)
    const speechifyTextLimit = Number.parseInt(speechifyLimit, 10)

    if (!Number.isFinite(littleVoiceTextLimit) || littleVoiceTextLimit <= 0) {
      toast.error("Little Voice text limit must be a positive number")
      return
    }
    if (!Number.isFinite(speechifyTextLimit) || speechifyTextLimit <= 0) {
      toast.error("Speechify text limit must be a positive number")
      return
    }
    if (speechifyTextLimit > 20000) {
      toast.error("Speechify's stream API hard cap is 20000 characters per request")
      return
    }
    if (speechifyTextLimit > littleVoiceTextLimit) {
      toast.error("Speechify limit cannot be larger than the Little Voice limit")
      return
    }

    setSaving(true)
    try {
      await updateSettings({ littleVoiceTextLimit, speechifyTextLimit })
      await mutate()
      toast.success("Text limits updated")
    } catch {
      toast.error("Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        description="Control how much text Little Voice API accepts, and how large each chunk sent to Speechify is allowed to be."
      />

      <GlassPanel className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 to-accent/10 text-primary">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-lg font-semibold text-foreground">Text limits</h2>
            <p className="font-sans text-xs text-muted-foreground">
              Long requests are automatically split on word boundaries and merged back into one audio file
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="little-voice-limit" className="font-sans text-xs">
                  Little Voice API text limit
                </Label>
                <Input
                  id="little-voice-limit"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={littleVoiceLimit}
                  onChange={(e) => setLittleVoiceLimit(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
                <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                  Maximum characters a caller may send to <code className="font-mono">/text-to-voice</code> in a
                  single request. Requests longer than this are rejected with a 413 error.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="speechify-limit" className="font-sans text-xs">
                  Speechify upstream text limit
                </Label>
                <Input
                  id="speechify-limit"
                  type="number"
                  min={1}
                  max={20000}
                  inputMode="numeric"
                  value={speechifyLimit}
                  onChange={(e) => setSpeechifyLimit(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
                <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                  Maximum characters sent to Speechify per upstream call (Speechify&apos;s stream API hard cap is
                  20000). Text above this is split on word boundaries into multiple Speechify requests and the
                  resulting audio is merged into one file.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 font-sans text-xs text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" />
                Example: a 45000-character request with a 20000 Speechify limit fans out into 3 upstream calls
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-primary-foreground shadow-[0_10px_28px_-10px_oklch(0.64_0.2_290_/_55%)] transition-transform duration-200 hover:scale-[1.02]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </form>
        )}
      </GlassPanel>
    </DashboardShell>
  )
}
