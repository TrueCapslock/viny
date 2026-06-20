import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { list, del } from "@vercel/blob"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ images: [] })
  }

  const [wineImages, userImages, suggestionImages] = await Promise.all([
    prisma.wine.findMany({ where: { image: { not: null } }, select: { image: true } }),
    prisma.user.findMany({ where: { image: { not: null } }, select: { image: true } }),
    prisma.wineSuggestion.findMany({ where: { image: { not: null } }, select: { image: true } }),
  ])

  const used = new Set([
    ...wineImages.map((w) => w.image!),
    ...userImages.map((u) => u.image!),
    ...suggestionImages.map((s) => s.image!),
  ])

  let cursor: string | undefined
  const allBlobs: { url: string; pathname: string; size: number; uploadedAt: string }[] = []

  do {
    const result = await list({ cursor, limit: 1000 })
    for (const blob of result.blobs) {
      allBlobs.push({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
      })
    }
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  const images = allBlobs.map((blob) => ({
    ...blob,
    used: used.has(blob.url),
  }))

  return NextResponse.json({ images })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Vercel Blob er ikke konfigurert" }, { status: 500 })
  }

  const { urls } = await request.json()
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Ingen URLer angitt" }, { status: 400 })
  }

  await del(urls)
  return NextResponse.json({ success: true })
}
