import { NextResponse } from "next/server"
import { listVoices } from "@/lib/firestore"
import { formatBDTime } from "@/lib/format"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Little Voice API's public voice list. Read-only mirror of the Voices
// dashboard collection — no auth required, matching the /text-to-voice
// endpoint's "just call it" design.
export async function GET() {
  try {
    const voices = await listVoices()

    return NextResponse.json({
      voices: voices.map((v) => ({
        id: v.voiceId,
        name: v.name,
        gender: v.gender,
        voice_type: v.voiceType,
        photo_url: v.photoUrl,
        sample_audio_url: v.sampleAudioUrl,
        languages: v.languages,
      })),
      total: voices.length,
      time: formatBDTime(),
    })
  } catch {
    return NextResponse.json({ error: "Could not load voices" }, { status: 500 })
  }
}
