import { removeTagsFromBuffer } from "node-id3"

// When a long text is split into multiple Speechify requests, each chunk
// comes back as its own independent MP3 buffer. Speechify (like most TTS
// engines) leaves a small amount of silence/encoder padding at the very start and end
// of every clip. Naively concatenating raw buffers keeps that padding in the
// middle of the final file, which is heard as a tiny stutter/pause right at
// the seam between chunks — most noticeable with different speakers/voices.
//
// To make the join sound continuous, a few milliseconds are shaved off the
// tail of every chunk except the last, and off the head of every chunk except
// the first, right at the seam. The cut is frame-accurate: MP3 is a
// frame-based format, so each chunk is parsed into its individual frames and
// whole frames are dropped until at least TRIM_MS of audio has been removed.
// This guarantees every cut lands exactly on a frame boundary, so the result
// still plays back seamlessly in any player.
const TRIM_MS = 60

export function mergeMp3Buffers(buffers: Buffer[]): Buffer {
  const cleaned = buffers.map(stripId3Tags)

  if (cleaned.length <= 1) {
    return cleaned[0] ?? Buffer.alloc(0)
  }

  const trimmed = cleaned.map((buf, i) => {
    let result = buf
    if (i > 0) result = trimMp3Edge(result, TRIM_MS, "start")
    if (i < cleaned.length - 1) result = trimMp3Edge(result, TRIM_MS, "end")
    return result
  })

  return Buffer.concat(trimmed)
}

function stripId3Tags(buffer: Buffer): Buffer {
  try {
    const result = removeTagsFromBuffer(buffer)
    return result ? result : buffer
  } catch {
    return buffer
  }
}

type Mp3Frame = {
  offset: number
  length: number
  durationMs: number
}

// MPEG version -> samples per frame for Layer III (what "mp3" almost always
// means). MPEG1 uses 1152 samples/frame; MPEG2 and MPEG2.5 use 576.
const SAMPLES_PER_FRAME: Record<number, number> = {
  1: 1152, // MPEG1
  2: 576, // MPEG2
  2.5: 576, // MPEG2.5
}

const BITRATES_KBPS: Record<string, number[]> = {
  // MPEG1 Layer III
  "1": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  // MPEG2 / MPEG2.5 Layer III
  "2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}

const SAMPLE_RATES: Record<string, number[]> = {
  "1": [44100, 48000, 32000],
  "2": [22050, 24000, 16000],
  "2.5": [11025, 12000, 8000],
}

// Walks the buffer frame-by-frame using the MPEG frame header. Returns null
// if the buffer doesn't look like a well-formed sequence of Layer III frames
// (e.g. free-format bitrate, or padding/garbage bytes) so callers can safely
// fall back to leaving the buffer untouched rather than risk corrupting it.
function parseMp3Frames(buffer: Buffer): Mp3Frame[] | null {
  const frames: Mp3Frame[] = []
  let offset = 0

  while (offset + 4 <= buffer.length) {
    const b0 = buffer[offset]
    const b1 = buffer[offset + 1]

    // Frame sync: 11 bits all set (0xFFE0 mask on the first two bytes).
    if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) {
      // Not a frame header at this offset — bail rather than guess.
      if (frames.length === 0) return null
      break
    }

    const versionBits = (b1 >> 3) & 0x03
    const layerBits = (b1 >> 1) & 0x03
    if (layerBits !== 1) return null // not Layer III

    const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : versionBits === 0 ? 2.5 : null
    if (version === null) return null

    const b2 = buffer[offset + 2]
    const bitrateIndex = (b2 >> 4) & 0x0f
    const sampleRateIndex = (b2 >> 2) & 0x03
    const padding = (b2 >> 1) & 0x01

    const bitrateTable = version === 1 ? BITRATES_KBPS["1"] : BITRATES_KBPS["2"]
    const sampleRateTable = version === 1 ? SAMPLE_RATES["1"] : version === 2 ? SAMPLE_RATES["2"] : SAMPLE_RATES["2.5"]

    if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null // free/bad format

    const bitrate = bitrateTable[bitrateIndex] * 1000
    const sampleRate = sampleRateTable[sampleRateIndex]
    if (!bitrate || !sampleRate) return null

    const samplesPerFrame = SAMPLES_PER_FRAME[version]
    const bytesPerSample = version === 1 ? 4 : 1
    const length = Math.floor((samplesPerFrame * bitrate) / 8 / sampleRate) + padding * bytesPerSample

    if (!Number.isFinite(length) || length < 4) return null

    const durationMs = (samplesPerFrame / sampleRate) * 1000

    frames.push({ offset, length, durationMs })
    offset += length
  }

  if (frames.length === 0) return null
  return frames
}

// Drops whole frames from the requested edge until at least `ms` of audio has
// been removed, then returns the remaining buffer. Falls back to the original
// buffer untouched if the frame structure can't be parsed, or if trimming
// would remove the entire clip.
function trimMp3Edge(buffer: Buffer, ms: number, edge: "start" | "end"): Buffer {
  if (ms <= 0) return buffer

  const frames = parseMp3Frames(buffer)
  if (!frames || frames.length <= 1) return buffer

  let removedMs = 0
  let framesToDrop = 0

  if (edge === "start") {
    for (const frame of frames) {
      if (removedMs >= ms || framesToDrop >= frames.length - 1) break
      removedMs += frame.durationMs
      framesToDrop++
    }
    const keepFrom = frames[framesToDrop]?.offset
    return keepFrom !== undefined ? buffer.subarray(keepFrom) : buffer
  }

  for (let i = frames.length - 1; i >= 0; i--) {
    if (removedMs >= ms || framesToDrop >= frames.length - 1) break
    removedMs += frames[i].durationMs
    framesToDrop++
  }
  const cutIndex = frames.length - framesToDrop
  const keepUntil = frames[cutIndex]?.offset
  return keepUntil !== undefined ? buffer.subarray(0, keepUntil) : buffer
}
