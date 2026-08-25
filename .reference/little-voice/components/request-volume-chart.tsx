"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { GlassPanel } from "@/components/glass-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { RequestLog } from "@/lib/types"

const DAYS_SHOWN = 7

const chartConfig: ChartConfig = {
  success: { label: "Successful", color: "var(--chart-1)" },
  errors: { label: "Errors", color: "var(--chart-4)" },
}

function buildDailyBuckets(logs: RequestLog[] | undefined) {
  const buckets: { date: string; label: string; success: number; errors: number }[] = []
  const now = new Date()

  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      success: 0,
      errors: 0,
    })
  }

  const byDate = new Map(buckets.map((b) => [b.date, b]))

  for (const log of logs ?? []) {
    const key = new Date(log.createdAt).toISOString().slice(0, 10)
    const bucket = byDate.get(key)
    if (!bucket) continue
    if (log.status === "success") bucket.success += 1
    else bucket.errors += 1
  }

  return buckets
}

export function RequestVolumeChart({
  logs,
  isLoading,
}: {
  logs: RequestLog[] | undefined
  isLoading: boolean
}) {
  const data = useMemo(() => buildDailyBuckets(logs), [logs])
  const hasActivity = data.some((d) => d.success > 0 || d.errors > 0)

  return (
    <GlassPanel className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-foreground">Request volume</h2>
        <p className="font-sans text-xs text-muted-foreground">Successful vs. failed generations, last {DAYS_SHOWN} days</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : hasActivity ? (
        <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="font-sans text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="success" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="errors" fill="var(--color-errors)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex h-52 items-center justify-center">
          <p className="font-sans text-sm text-muted-foreground">
            No activity in the last {DAYS_SHOWN} days yet.
          </p>
        </div>
      )}
    </GlassPanel>
  )
}
