import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { searchWines, WineapiError } from "@/lib/wineapi"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const maxResults = searchParams.get("maxResults")

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 })
  }

  try {
    const results = await searchWines(apiKey, query, maxResults ? parseInt(maxResults) : 10)
    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof WineapiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
