// Speechify's text-to-speech API rejects any single request above its own
// character limit (an admin-configurable value, settings.speechifyTextLimit,
// capped at Speechify's hard limit of 20,000 characters on /v1/audio/stream).
// Little Voice API accepts much longer text and transparently fans it out
// into multiple upstream requests, so this splitter turns one long string
// into upstream-sized chunks.
//
// The only rule that matters: never cut a word in half. If the limit lands in
// the middle of a word (e.g. "Hasan" split into "Has" | "an", or "হাসান" split
// mid-syllable), the cut point backs up to the previous whitespace so the
// whole word carries over into the next chunk instead. This works for any
// space-separated script (Bengali, Hindi, English, etc.) since it only looks
// for whitespace, not language-specific rules.
export function splitTextByLimit(text: string, limit: number): string[] {
  const trimmed = text.trim()
  if (limit <= 0 || trimmed.length <= limit) {
    return trimmed ? [trimmed] : []
  }

  const chunks: string[] = []
  let remaining = trimmed

  while (remaining.length > limit) {
    const slice = remaining.slice(0, limit)

    let cutAt = -1
    for (let i = slice.length - 1; i >= 0; i--) {
      if (/\s/.test(slice[i])) {
        cutAt = i
        break
      }
    }

    // No whitespace anywhere in the slice - a single word/token longer than
    // the limit. Fall back to a hard cut so the loop always makes progress.
    if (cutAt <= 0) {
      cutAt = limit
    }

    const chunk = remaining.slice(0, cutAt).trim()
    if (chunk) chunks.push(chunk)
    remaining = remaining.slice(cutAt).trim()
  }

  if (remaining) chunks.push(remaining)

  return chunks
}
