// Bangladesh Standard Time (Asia/Dhaka, UTC+6) formatter used for the public
// Little Voice API response so integrators get a locale-correct timestamp
// without doing their own timezone math.
export function formatBDTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date)
}

// Renders a duration in seconds as a compact "1m 4s" / "5s" / "5m" style
// string, matching how audio lengths should read in API responses and UI.
export function formatAudioDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = Math.round(safeSeconds % 60)

  if (minutes === 0) return `${seconds}s`
  if (seconds === 0) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}
