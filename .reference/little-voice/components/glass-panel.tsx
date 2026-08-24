import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

export function GlassPanel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass-panel", className)} {...props} />
}
