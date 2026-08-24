import type { LucideIcon } from "lucide-react"
import { GlassPanel } from "@/components/glass-panel"
import { cn } from "@/lib/utils"

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: "default" | "success" | "danger"
}) {
  return (
    <GlassPanel className="group flex flex-col gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br transition-transform duration-200 group-hover:scale-110",
            tone === "success" && "from-emerald-500/25 to-emerald-500/5 text-emerald-400",
            tone === "danger" && "from-destructive/25 to-destructive/5 text-destructive",
            tone === "default" && "from-primary/25 to-accent/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-serif text-2xl font-semibold text-foreground">{value}</span>
        <span className="font-sans text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      </div>
    </GlassPanel>
  )
}
