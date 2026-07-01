import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { identifyWineByImage, WineapiError } from "@/lib/wineapi"

// POST /api/wineapi/identify -- accepts a multipart/form-data upload with
// a single `image` field (jpg/png/webp, max ~5MB per wineapi.io) and
// proxies it to https://api.wineapi.io/v4/identify/image, authenticating
// with the caller's saved wineapiKey. The user key never reaches the
// browser. Returns a JSON array of match candidates with confidence
// scores so the client can show ranked suggestions.
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { wineapiKey: true },
  })

  const apiKey = user?.wineapiKey
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ingen wineapi.io API-nøkkel. Legg til i profilen din." },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Kunne ikke lese bildeopplastingen. Sjekk at filen er en gyldig JPG/PNG/WebP under 5 MB.",
      },
      { status: 400 },
    )
  }

  const file = formData.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Bilde mangler eller er ugyldig." },
      { status: 400 },
    )
  }

  try {
    const bytes = await file.arrayBuffer()
    const matches = await identifyWineByImage(apiKey, bytes, file.type)
    return NextResponse.json(matches)
  } catch (error) {
    if (error instanceof WineapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[wineapi/identify] unexpected error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
