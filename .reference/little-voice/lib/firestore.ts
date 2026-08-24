import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { firestoreDb } from "@/lib/firebase"
import type { ApiSettings, RequestLog, SpeechifyApiKey, Voice } from "@/lib/types"

const KEYS_COLLECTION = "apiKeys"
const VOICES_COLLECTION = "voices"
const LOGS_COLLECTION = "requestLogs"
const SETTINGS_COLLECTION = "settings"
const SETTINGS_DOC_ID = "config"

// Speechify's own /v1/audio/stream upstream limit as of writing (10x higher
// than the 2,000-char /v1/audio/speech limit). Kept as the default so a
// fresh project behaves correctly even before anyone opens the Settings page.
export const DEFAULT_SPEECHIFY_TEXT_LIMIT = 20000
// Generous default ceiling for total input accepted by Little Voice API.
export const DEFAULT_LITTLE_VOICE_TEXT_LIMIT = 50000

// ---------- Speechify API keys ----------

export async function listApiKeys(): Promise<SpeechifyApiKey[]> {
  const snap = await getDocs(query(collection(firestoreDb, KEYS_COLLECTION), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => {
    const data = d.data() as Omit<SpeechifyApiKey, "id">
    return {
      id: d.id,
      ...data,
      // Older key docs predate charactersBilled/coolingDownUntil — default
      // them so every consumer can rely on both fields always being present.
      charactersBilled: data.charactersBilled ?? 0,
      coolingDownUntil: data.coolingDownUntil ?? null,
    }
  })
}

export async function addApiKey(label: string, key: string) {
  await addDoc(collection(firestoreDb, KEYS_COLLECTION), {
    label,
    key,
    active: true,
    createdAt: Date.now(),
    lastUsedAt: null,
    successCount: 0,
    errorCount: 0,
    charactersBilled: 0,
    coolingDownUntil: null,
  })
}

export async function toggleApiKey(id: string, active: boolean) {
  await updateDoc(doc(firestoreDb, KEYS_COLLECTION, id), { active })
}

export async function deleteApiKey(id: string) {
  await deleteDoc(doc(firestoreDb, KEYS_COLLECTION, id))
}

// Speechify rate-limit responses put a key in "cooldown" for this long before
// the request loop will try it again ahead of other, healthier keys.
const RATE_LIMIT_COOLDOWN_MS = 60_000

export async function markApiKeyResult(
  id: string,
  ok: boolean,
  opts?: { status?: number; billableCharacters?: number },
) {
  await updateDoc(doc(firestoreDb, KEYS_COLLECTION, id), {
    lastUsedAt: Date.now(),
    ...(ok
      ? {
          successCount: increment(1),
          charactersBilled: increment(opts?.billableCharacters ?? 0),
          coolingDownUntil: null,
        }
      : {
          errorCount: increment(1),
          ...(opts?.status === 429 ? { coolingDownUntil: Date.now() + RATE_LIMIT_COOLDOWN_MS } : {}),
        }),
  })
}

// ---------- Voices ----------

export async function listVoices(): Promise<Voice[]> {
  const snap = await getDocs(query(collection(firestoreDb, VOICES_COLLECTION), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Voice, "id" | "languages"> & {
      languages?: Voice["languages"]
      // Older voice docs stored a single language string instead of an array.
      language?: Voice["languages"][number]
    }
    return {
      id: d.id,
      ...data,
      languages: data.languages ?? (data.language ? [data.language] : []),
    }
  })
}

export async function addVoice(voice: Omit<Voice, "id" | "createdAt">) {
  await addDoc(collection(firestoreDb, VOICES_COLLECTION), {
    ...voice,
    createdAt: Date.now(),
  })
}

export async function updateVoice(id: string, patch: Partial<Omit<Voice, "id" | "createdAt">>) {
  await updateDoc(doc(firestoreDb, VOICES_COLLECTION, id), { ...patch })
}

export async function deleteVoice(id: string) {
  await deleteDoc(doc(firestoreDb, VOICES_COLLECTION, id))
}

// ---------- Request logs ----------

export async function listRequestLogs(max = 100): Promise<RequestLog[]> {
  const snap = await getDocs(
    query(collection(firestoreDb, LOGS_COLLECTION), orderBy("createdAt", "desc"), limit(max)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RequestLog, "id">) }))
}

export async function addRequestLog(log: Omit<RequestLog, "id" | "createdAt">) {
  await addDoc(collection(firestoreDb, LOGS_COLLECTION), {
    ...log,
    createdAt: Date.now(),
  })
}

// ---------- Api settings ----------

export async function getSettings(): Promise<ApiSettings> {
  const snap = await getDoc(doc(firestoreDb, SETTINGS_COLLECTION, SETTINGS_DOC_ID))
  const data = snap.exists() ? (snap.data() as Partial<ApiSettings>) : {}
  return {
    littleVoiceTextLimit: data.littleVoiceTextLimit ?? DEFAULT_LITTLE_VOICE_TEXT_LIMIT,
    speechifyTextLimit: data.speechifyTextLimit ?? DEFAULT_SPEECHIFY_TEXT_LIMIT,
  }
}

export async function updateSettings(settings: Partial<ApiSettings>) {
  await setDoc(doc(firestoreDb, SETTINGS_COLLECTION, SETTINGS_DOC_ID), settings, { merge: true })
}

// ---------- Audio cache ----------
// Identical text + speaker + language requests reuse the merged audio
// instead of calling Speechify again, saving billable characters. Cache docs
// are keyed by a hash of the request and skipped if the merged audio would
// be too large for a single Firestore document.

const AUDIO_CACHE_COLLECTION = "audioCache"
export const AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000
// Firestore hard-caps documents at ~1 MiB. Stay well under that so the
// base64 payload plus field overhead never risks a write failure.
export const AUDIO_CACHE_MAX_BASE64_LENGTH = 700_000

type AudioCacheEntry = {
  audioBase64: string
  billableCharacters: number
  chunksUsed: number
  durationMs: number
  createdAt: number
}

export async function getCachedAudio(cacheKey: string): Promise<AudioCacheEntry | null> {
  const snap = await getDoc(doc(firestoreDb, AUDIO_CACHE_COLLECTION, cacheKey))
  if (!snap.exists()) return null
  const data = snap.data() as AudioCacheEntry
  if (Date.now() - data.createdAt > AUDIO_CACHE_TTL_MS) return null
  return data
}

export async function setCachedAudio(cacheKey: string, entry: Omit<AudioCacheEntry, "createdAt">) {
  if (entry.audioBase64.length > AUDIO_CACHE_MAX_BASE64_LENGTH) return
  await setDoc(doc(firestoreDb, AUDIO_CACHE_COLLECTION, cacheKey), {
    ...entry,
    createdAt: Date.now(),
  })
}
