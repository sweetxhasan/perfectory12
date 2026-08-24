"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Activity, AlertTriangle, CheckCircle2, KeyRound, Timer, XCircle, Zap } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { GlassPanel } from "@/components/glass-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApiKeys, useRequestLogs } from "@/lib/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { RequestVolumeChart } from "@/components/request-volume-chart"

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// A run of consecutive failures across every active key (not just one flaky
// request) is treated as an outage worth surfacing prominently.
const OUTAGE_STREAK_THRESHOLD = 3

export default function DashboardPage() {
  const { data: keys, isLoading: keysLoading } = useApiKeys()
  const { data: logs, isLoading: logsLoading } = useRequestLogs(50)

  const stats = useMemo(() => {
    const totalRequests = logs?.length ?? 0
    const success = logs?.filter((l) => l.status === "success").length ?? 0
    const errors = logs?.filter((l) => l.status === "error").length ?? 0
    const activeKeys = keys?.filter((k) => k.active).length ?? 0
    return { totalRequests, success, errors, activeKeys }
  }, [logs, keys])

  const outage = useMemo(() => {
    if (!logs || logs.length < OUTAGE_STREAK_THRESHOLD) return null
    const recent = logs.slice(0, OUTAGE_STREAK_THRESHOLD)
    const allFailed = recent.every((l) => l.status === "error")
    if (!allFailed) return null
    return recent[0]
  }, [logs])

  return (
    <DashboardShell>
      <PageHeader
        title="Dashboard"
        description="Live overview of request volume, upstream key health, and generation activity across Little Voice API."
        action={
          <Button
            render={<Link href="/generator" />}
            className="bg-primary font-sans text-primary-foreground hover:bg-primary/90"
          >
            Generate voice
          </Button>
        }
      />

      {outage && (
        <GlassPanel className="flex items-start gap-3 border-destructive/30 bg-destructive/10 p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-serif text-sm font-semibold text-destructive">
              Possible outage — last {OUTAGE_STREAK_THRESHOLD} requests all failed
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {outage.errorMessage ?? "Every configured API key failed."} Check the Api Keys page for cooling
              down or exhausted keys.
            </span>
          </div>
          <Button
            render={<Link href="/apikeys" />}
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 border-destructive/30 bg-transparent font-sans text-destructive hover:bg-destructive/10"
          >
            Review keys
          </Button>
        </GlassPanel>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Activity} label="Total requests" value={String(stats.totalRequests)} />
        <StatCard icon={CheckCircle2} label="Successful" value={String(stats.success)} tone="success" />
        <StatCard icon={XCircle} label="Errors" value={String(stats.errors)} tone="danger" />
        <StatCard icon={KeyRound} label="Active keys" value={String(stats.activeKeys)} />
      </div>

      <RequestVolumeChart logs={logs} isLoading={logsLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassPanel className="flex flex-col gap-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-foreground">Recent requests</h2>
            <Badge variant="outline" className="border-white/10 bg-white/5 font-sans text-xs">
              Live · refreshes every 10s
            </Badge>
          </div>

          {logsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="flex flex-col divide-y divide-white/10">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        log.status === "success"
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"
                          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive"
                      }
                    >
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-sans text-sm text-foreground">{log.textPreview}</span>
                      <span className="flex flex-wrap items-center gap-x-1.5 font-sans text-xs text-muted-foreground">
                        <span>
                          {log.speaker} · {log.languageCode} · {formatTime(log.createdAt)}
                        </span>
                        {log.chunksUsed != null && log.chunksUsed > 1 && (
                          <span className="text-foreground/70">· {log.chunksUsed} chunks</span>
                        )}
                        {log.billableCharacters != null && !log.cached && (
                          <span className="text-foreground/70">· {log.billableCharacters} chars billed</span>
                        )}
                        {log.cached && (
                          <span className="flex items-center gap-1 text-primary">
                            <Zap className="h-3 w-3" /> cached
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-sans text-xs text-muted-foreground">{log.durationMs}ms</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center font-sans text-sm text-muted-foreground">
              No requests yet. Generate your first voice to see activity here.
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-4 p-6">
          <h2 className="font-serif text-lg font-semibold text-foreground">Key pool health</h2>
          {keysLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : keys && keys.length > 0 ? (
            <div className="flex flex-col gap-3">
              {keys.slice(0, 6).map((k) => {
                const isCoolingDown = !!k.coolingDownUntil && k.coolingDownUntil > Date.now()
                return (
                  <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-sans text-sm text-foreground">{k.label}</span>
                      <span className="font-sans text-xs text-muted-foreground">
                        {k.successCount} ok · {k.errorCount} err
                      </span>
                    </div>
                    {isCoolingDown ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-amber-500/30 bg-amber-500/15 font-sans text-amber-400"
                      >
                        <Timer className="h-3 w-3" />
                        Cooling down
                      </Badge>
                    ) : (
                      <Badge
                        className={
                          k.active
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-sans"
                            : "border-white/10 bg-white/5 text-muted-foreground font-sans"
                        }
                        variant="outline"
                      >
                        {k.active ? "Active" : "Disabled"}
                      </Badge>
                    )}
                  </div>
                )
              })}
              <Button
                render={<Link href="/apikeys" />}
                variant="outline"
                className="mt-1 rounded-xl border-white/10 bg-white/5 font-sans"
              >
                Manage keys
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-sm text-muted-foreground">
                No Speechify API keys added yet. Add at least one key to start generating voices.
              </p>
              <Button
                render={<Link href="/apikeys" />}
                className="bg-primary font-sans text-primary-foreground hover:bg-primary/90"
              >
                Add your first key
              </Button>
            </div>
          )}
        </GlassPanel>
      </div>
    </DashboardShell>
  )
}
