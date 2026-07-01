import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { recognizeWithOpenRouter } from "@/lib/openrouter"

/// Default vision model when the user hasn't picked one. Free tier
/// on OpenRouter; rotates occasionally, so we let users override in
/// their profile.
const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free"

/// POST /api/ocr-vision -- accepts a multipart/form-data upload with
/// a single `image` field (any browser-acceptable image MIME) and
/// proxies it to https://openrouter.ai/api/v1/chat/completions using
/// the caller's saved OpenRouter key + vision model. The user key
/// never reaches the browser. Returns a JSON object with the LLM's
/// text response so the client can pipe it through buildSearchQuery
/// to assemble the final wineapi.io search query.
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { openRouterKey: true, visionModel: true },
  })

  if (!user?.openRouterKey) {
    return NextResponse.json(
      {
        error:
          "Ingen OpenRouter API-n\u00f8kkel. Legg til i profilen din for \u00e5 bruke AI-skann.",
      },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke lese bildeopplastingen." },
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
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await recognizeWithOpenRouter(
      user.openRouterKey,
      user.visionModel ?? DEFAULT_MODEL,
      buffer,
      file.type || "image/jpeg",
    )
    return NextResponse.json({ text })
  } catch (err) {
    console.error("[ocr-vision] failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OpenRouter OCR feilet" },
      { status: 500 },
    )
  }
}
