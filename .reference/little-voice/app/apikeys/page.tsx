"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Plus, Timer, Trash2, Type, XCircle } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { GlassPanel } from "@/components/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useApiKeys } from "@/lib/hooks"
import { addApiKey, deleteApiKey, toggleApiKey } from "@/lib/firestore"

function maskKey(key: string) {
  if (key.length <= 8) return "••••••••"
  return `${key.slice(0, 4)}${"•".repeat(Math.max(6, key.length - 8))}${key.slice(-4)}`
}

function formatCharacters(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function ApiKeysPage() {
  const { data: keys, isLoading, mutate } = useApiKeys()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [key, setKey] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [now, setNow] = useState(() => Date.now())

  // Ticks the cooldown countdown on rate-limited keys without needing a
  // network refresh — SWR's own 15s refresh keeps the underlying data fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!label.trim() || !key.trim()) return
    setSubmitting(true)
    try {
      await addApiKey(label.trim(), key.trim())
      await mutate()
      toast.success("Speechify API key added", { description: label })
      setLabel("")
      setKey("")
      setOpen(false)
    } catch {
      toast.error("Could not add key")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleApiKey(id, active)
    await mutate()
  }

  async function handleDelete(id: string) {
    await deleteApiKey(id)
    await mutate()
    toast.success("Key removed")
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Api Keys"
        description="Add unlimited Speechify API keys. Little Voice API rotates through active keys automatically — if one fails, the next key is tried until a request succeeds."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-primary-foreground shadow-[0_10px_28px_-10px_oklch(0.64_0.2_290_/_55%)] hover:scale-[1.02]" />
              }
            >
              <Plus className="h-4 w-4" />
              Add key
            </DialogTrigger>
            <DialogContent className="glass-strong rounded-3xl border border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-lg">Add Speechify API key</DialogTitle>
                <DialogDescription className="font-sans">
                  This key is used to authenticate requests forwarded to Speechify on behalf of Little Voice API.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="label" className="font-sans text-xs">
                    Label
                  </Label>
                  <Input
                    id="label"
                    placeholder="e.g. Primary key, Backup key #2"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="font-sans"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="key" className="font-sans text-xs">
                    Speechify API token
                  </Label>
                  <Input
                    id="key"
                    placeholder="sk_live_..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <DialogFooter className="!mx-0 !mb-0 rounded-none border-none !bg-transparent !p-0">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-primary-foreground hover:scale-[1.02]"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save key
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <GlassPanel className="flex flex-col gap-4 p-5 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : keys && keys.length > 0 ? (
          <div className="flex flex-col gap-3">
            {keys.map((k) => {
              const cooldownRemainingMs = k.coolingDownUntil ? k.coolingDownUntil - now : 0
              const isCoolingDown = cooldownRemainingMs > 0

              return (
                <div
                  key={k.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors duration-200 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 to-accent/10 text-primary transition-transform duration-200 group-hover:scale-110">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-serif text-sm font-semibold text-foreground">{k.label}</span>
                      <button
                        type="button"
                        onClick={() => setVisible((v) => ({ ...v, [k.id]: !v[k.id] }))}
                        className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground"
                      >
                        <span className="truncate">{visible[k.id] ? k.key : maskKey(k.key)}</span>
                        {visible[k.id] ? (
                          <EyeOff className="h-3 w-3 shrink-0" />
                        ) : (
                          <Eye className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                      <span className="flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
                        <Type className="h-3 w-3 shrink-0" /> {formatCharacters(k.charactersBilled)} chars billed
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                    <div className="flex items-center gap-1.5 font-sans text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {k.successCount}
                    </div>
                    <div className="flex items-center gap-1.5 font-sans text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> {k.errorCount}
                    </div>
                    {isCoolingDown && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-amber-500/30 bg-amber-500/15 font-sans text-amber-400"
                      >
                        <Timer className="h-3 w-3" />
                        Cooling down {Math.ceil(cooldownRemainingMs / 1000)}s
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        k.active
                          ? "border-emerald-500/30 bg-emerald-500/15 font-sans text-emerald-400"
                          : "border-white/10 bg-white/5 font-sans text-muted-foreground"
                      }
                    >
                      {k.active ? "Active" : "Disabled"}
                    </Badge>
                    <Switch checked={k.active} onCheckedChange={(v) => handleToggle(k.id, v)} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(k.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </span>
            <p className="max-w-sm font-sans text-sm text-muted-foreground">
              No Speechify API keys yet. Add your first key to enable text-to-speech generation.
            </p>
          </div>
        )}
      </GlassPanel>
    </DashboardShell>
  )
}
