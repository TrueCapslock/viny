import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { put } from "@vercel/blob"
import path from "path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Ingen fil valgt" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Filen må være et bilde" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Bildet kan ikke være større enn 5 MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `wine-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, file, { access: "public" })
      return NextResponse.json({ url: blob.url })
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Bildeopplasting krever Vercel Blob. Legg til BLOB_READ_WRITE_TOKEN i Vercel." },
        { status: 500 },
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dir = path.join(process.cwd(), "public", "uploads")
    const localFilename = filename.replace("wine-images/", "")
    const filepath = path.join(dir, localFilename)
    await mkdir(dir, { recursive: true })
    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${localFilename}` })
  } catch (error) {
    console.error("Image upload failed", error)
    return NextResponse.json({ error: "Kunne ikke laste opp bildet" }, { status: 500 })
  }
}
