// Auto-assigned character avatars, generated live by the DiceBear CDN API —
// no upload, no pasted URL, no static/simulated image files. Every voice
// gets a deterministic "Personas" portrait (a premium, flat-design
// half-body illustration style) computed from its name + gender, so the
// same voice always renders the same face and different voices spread
// across the available look combinations.
// Docs: https://www.dicebear.com/styles/personas/

const DICEBEAR_ENDPOINT = "https://api.dicebear.com/10.x/personas/svg"

const MALE_HAIR = [
  "buzzcut",
  "fade",
  "mohawk",
  "sideShave",
  "shortCombover",
  "shortComboverChops",
  "cap",
  "beanie",
  "bald",
  "balding",
]

const FEMALE_HAIR = [
  "pigtails",
  "bunUndercut",
  "curlyBun",
  "straightBun",
  "extraLong",
  "bobCut",
  "bobBangs",
  "long",
  "curly",
]

const FACIAL_HAIR = ["beardMustache", "goatee", "pyramid", "shadow", "soulPatch", "walrus"]

const CLOTHES = ["checkered", "rounded", "small", "squared"]
const EYES = ["glasses", "happy", "open", "sleep", "wink"]
const MOUTH = ["bigSmile", "smile", "smirk"]
const NOSE = ["mediumRound", "smallRound", "wrinkles"]

const SKIN_TONES = ["614335", "ae5d29", "d08b5b", "edb98a", "ffdbb4", "fd9841"]
const HAIR_COLORS = ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "e8e1e1"]

// Brand-matched clothing colors and background gradient pairs so every
// generated avatar stays on-theme with Little Voice API's violet/indigo
// palette instead of DiceBear's default randomized colors.
const CLOTHING_COLORS = ["7c3aed", "4f46e5", "6366f1", "8b5cf6", "a855f7"]
const BACKGROUND_GRADIENTS: [string, string][] = [
  ["4c1d95", "1e1b4b"],
  ["5b21b6", "312e81"],
  ["6d28d9", "1e1b4b"],
  ["4338ca", "1e1b4b"],
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function pick<T>(pool: T[], hash: number): T {
  return pool[hash % pool.length]
}

/**
 * Builds a deterministic DiceBear "Personas" avatar URL for a voice from
 * its name and gender. Same seed + gender always resolves to the same
 * face; different names spread across hairstyles, clothing, and
 * skin/hair tones. Rendered live by DiceBear's CDN — nothing is
 * pre-generated or stored.
 */
export function getVoiceAvatar(seed: string, gender: "male" | "female"): string {
  const trimmed = seed.trim().toLowerCase() || "voice"
  const hash = hashSeed(trimmed)

  const hair = gender === "male" ? pick(MALE_HAIR, hash) : pick(FEMALE_HAIR, hash)
  const clothes = pick(CLOTHES, hash >> 3)
  const eyes = pick(EYES, hash >> 4)
  const mouth = pick(MOUTH, hash >> 6)
  const nose = pick(NOSE, hash >> 8)
  const skinColor = pick(SKIN_TONES, hash >> 5)
  const hairColor = pick(HAIR_COLORS, hash >> 7)
  const clothingColor = pick(CLOTHING_COLORS, hash >> 9)
  const [bgFrom, bgTo] = pick(BACKGROUND_GRADIENTS, hash >> 10)

  const params = new URLSearchParams({
    seed: trimmed,
    hairVariant: hair,
    hairProbability: "100",
    clothesVariant: clothes,
    clothesProbability: "100",
    eyesVariant: eyes,
    eyesProbability: "100",
    mouthVariant: mouth,
    mouthProbability: "100",
    noseVariant: nose,
    noseProbability: "100",
    skinColor,
    hairColor,
    clothingColor,
    backgroundColorFill: "linear",
    radius: "12",
    // Personas' facial hair and glasses are male-leaning accents — keep
    // them off female avatars entirely rather than letting DiceBear roll
    // a random chance.
    facialHairProbability: "0",
  })

  // DiceBear expects multi-value color params (like a two-stop gradient)
  // as repeated query keys, not a single comma-joined value — a
  // comma-joined value fails validation and the CDN returns a JSON error
  // instead of an image, which is what produced the broken avatar.
  params.append("backgroundColor", bgFrom)
  params.append("backgroundColor", bgTo)

  // Roughly half of male voices get facial hair, chosen deterministically
  // from the seed rather than DiceBear's own probability roll, so the same
  // name always renders the same way.
  if (gender === "male" && hash % 100 < 50) {
    params.set("facialHairVariant", pick(FACIAL_HAIR, hash >> 11))
    params.set("facialHairProbability", "100")
  }

  return `${DICEBEAR_ENDPOINT}?${params.toString()}`
}
