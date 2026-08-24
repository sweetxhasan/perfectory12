"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"

type VoiceSampleButtonProps = {
  url: string
  className?: string
  size?: "sm" | "md"
}

const RADIUS = 15
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Advanced sample-audio control: a single round button that doubles as a
 * play/pause toggle and a live progress ring, instead of a plain labeled
 * "Play sample" button. Only one instance plays at a time — starting a new
 * one pauses whichever sample was already playing.
 */
export function VoiceSampleButton({ url, className, size = "md" }: VoiceSampleButtonProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function reset() {
    setPlaying(false)
    setProgress(0)
  }

  function toggle() {
    if (!url) return

    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }

    // Stop every other sample currently playing on the page before starting
    // this one, so only one voice is ever heard at a time.
    document.dispatchEvent(new CustomEvent("voice-sample-play", { detail: { url } }))

    if (!audioRef.current) {
      const audio = new Audio(url)
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration)
      }
      audio.onended = reset
      audio.onerror = reset
      audioRef.current = audio
    }
    audioRef.current.currentTime = 0
    audioRef.current.play()
    setPlaying(true)
  }

  useEffect(() => {
    function handleOtherPlay(e: Event) {
      const detail = (e as CustomEvent<{ url: string }>).detail
      if (detail.url !== url) {
        audioRef.current?.pause()
        reset()
      }
    }
    document.addEventListener("voice-sample-play", handleOtherPlay)
    return () => document.removeEventListener("voice-sample-play", handleOtherPlay)
  }, [url])

  if (!url) return null

  const dashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        className,
      )}
      aria-label={playing ? "Pause sample" : "Play sample"}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={RADIUS} className="fill-none stroke-white/10" strokeWidth="2" />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-150 ease-linear"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={playing ? dashoffset : CIRCUMFERENCE}
        />
      </svg>
      {playing ? (
        <Pause className={cn("fill-current", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <Play className={cn("fill-current", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
    </button>
  )
}
