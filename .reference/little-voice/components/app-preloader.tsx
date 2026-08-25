"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand-mark"

const WAVE_DELAYS = [0, 0.12, 0.24, 0.36, 0.48, 0.36, 0.24, 0.12]

export function AppPreloader() {
  const { loading } = useAuth()
  const [mounted, setMounted] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!loading) {
      setFading(true)
      const timeout = setTimeout(() => setMounted(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [loading])

  if (!mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        fading ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 10%, oklch(0.42 0.16 292 / 45%) 0%, transparent 45%), radial-gradient(circle at 85% 90%, oklch(0.4 0.14 258 / 38%) 0%, transparent 50%)",
      }}
    >
      <span className="sr-only">Loading Little Voice API</span>

      <div className="animate-preloader-fade-in flex flex-col items-center gap-7">
        <BrandMark iconOnly size="lg" className="drop-shadow-[0_12px_32px_oklch(0.64_0.2_290_/_55%)]" />

        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="font-serif text-xl font-semibold leading-none text-foreground">
            Little Voice <span className="text-primary">API</span>
          </p>
          <p className="text-sm text-muted-foreground">Warming up your voices…</p>
        </div>

        {/* Waveform loader */}
        <div className="flex h-9 items-center gap-1.5">
          {WAVE_DELAYS.map((delay, i) => (
            <span
              key={i}
              className="animate-preloader-wave w-1.5 rounded-full bg-primary"
              style={{ height: "100%", animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        {/* Indeterminate progress shimmer */}
        <div className="relative h-1 w-40 overflow-hidden rounded-full bg-border">
          <span
            className="animate-preloader-shimmer absolute inset-y-0 left-0 w-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.64 0.2 290 / 90%), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  )
}
