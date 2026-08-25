"use client"

import Image from "next/image"
import { Mic2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Voice } from "@/lib/types"
import { VoiceSampleButton } from "@/components/voice-sample-button"

/**
 * Compact, horizontally-scrollable voice picker. Each card sizes itself to
 * its content (avatar + name + sample button only, no checkmark) so the
 * row never uses more width or height than it needs — selection is shown
 * purely through the card's own border/glow instead of a separate check
 * icon, keeping the footprint minimal and premium-feeling.
 */
export function VoiceChipSelect({
  voices,
  value,
  onChange,
}: {
  voices: Voice[]
  value: string
  onChange: (voiceId: string) => void
}) {
  if (voices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 font-sans text-xs text-muted-foreground">
        No voices match this language and filter yet — add one on the Voices page or try another filter.
      </div>
    )
  }

  return (
    <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {voices.map((v) => {
        const active = v.voiceId === value
        return (
          <div
            key={v.id}
            role="button"
            tabIndex={0}
            onClick={() => onChange(v.voiceId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onChange(v.voiceId)
              }
            }}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-2.5 transition-all duration-200 cursor-pointer",
              active
                ? "border-primary/60 bg-gradient-to-r from-primary/25 via-accent/15 to-primary/10 shadow-[0_8px_20px_-10px_oklch(0.64_0.2_290_/_60%)]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
            )}
          >
            <span
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br from-primary/20 to-accent/10",
                active ? "border-primary/50" : "border-white/10",
              )}
            >
              {v.photoUrl ? (
                <Image src={v.photoUrl || "/placeholder.svg"} alt="" fill className="object-cover" unoptimized />
              ) : (
                <Mic2 className="h-3.5 w-3.5 text-primary" />
              )}
            </span>

            <span
              className={cn(
                "whitespace-nowrap font-sans text-xs font-medium",
                active ? "text-foreground" : "text-foreground/80",
              )}
            >
              {v.name}
            </span>

            {v.sampleAudioUrl && (
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <VoiceSampleButton url={v.sampleAudioUrl} size="sm" />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
