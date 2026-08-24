import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload"
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const IMGBB_API_KEY = "3ee56b707e39804a444bf7dbb08599ee"

export async function POST(req: Request) {
  const apiKey = process.env.IMGBB_API_KEY || IMGBB_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Image upload is not configured" }, { status: 500 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = form.get("image")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Image must be smaller than 8MB" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")

  const uploadForm = new FormData()
  uploadForm.set("image", base64)

  try {
    const res = await fetch(`${IMGBB_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      body: uploadForm,
    })

    const data = await res.json()

    if (!res.ok || !data?.data?.url) {
      return NextResponse.json({ error: data?.error?.message || "Upload failed" }, { status: 502 })
    }

    return NextResponse.json({ url: data.data.url as string })
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 502 })
  }
}
