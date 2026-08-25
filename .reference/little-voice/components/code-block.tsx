"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        "relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-glass-border bg-[oklch(0.13_0.02_285)]",
        className,
      )}
    >
      <button
        onClick={handleCopy}
        aria-label="Copy code"
        className={cn(
          "absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-sans transition-all duration-200",
          copied
            ? "bg-primary/25 text-primary shadow-[0_0_16px_oklch(0.64_0.2_290_/_50%)]"
            : "bg-white/10 text-white/80 hover:bg-white/20",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain p-4 pr-20 font-mono text-[13px] leading-relaxed text-[oklch(0.9_0.02_290)] [-webkit-overflow-scrolling:touch]">
        <code className="whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}
