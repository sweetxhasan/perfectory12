"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const BAR_COUNT = 32

// Deterministic per-index heights (instead of Math.random()) so the
// waveform bars render identically on the server and the client — random
// values here would produce a different SSR vs. hydration markup on every
// load and trigger a hydration mismatch.
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const wave = Math.sin(i * 0.9) * 0.5 + 0.5
  return 0.25 + wave * 0.75
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * Self-contained generated-audio player: a big gradient play/pause button
 * next to a waveform-style bar visualizer, a scrub bar, and download/replay
 * actions. Replaces the plain browser <audio controls> element with
 * something that matches the rest of the premium glass UI.
 */
export function OutputPlayer({
  src,
  downloadHref,
  downloadName = "little-voice-output.mp3",
  className,
}: {
  src: string
  downloadHref?: string
  downloadName?: string
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => setCurrent(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setCurrent(0)
    }
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnd)
    return () => {
      audio.pause()
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnd)
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function replay() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
    setPlaying(true)
  }

  function seek(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrent(value)
  }

  const progress = duration ? current / duration : 0

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_10px_28px_-8px_oklch(0.64_0.2_290_/_60%)] transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <div className="flex h-12 flex-1 items-center gap-[3px]" aria-hidden="true">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={cn(
                "min-w-[2px] flex-1 origin-center rounded-full transition-colors duration-200",
                i / BAR_COUNT <= progress ? "bg-gradient-to-b from-primary to-accent" : "bg-white/10",
                playing && "animate-preloader-wave",
              )}
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 12) * 0.06}s` }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
          aria-label="Seek"
        />
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {downloadHref && (
          <Button
            render={<a href={downloadHref} download={downloadName} />}
            nativeButton={false}
            variant="secondary"
            size="sm"
            className="gap-2 rounded-xl border border-border bg-card/60 font-sans text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={replay}
          className="gap-2 rounded-xl border border-border bg-card/60 font-sans text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay
        </Button>
      </div>
    </div>
  )
}
