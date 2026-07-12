import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { lookupOffEan, OFF_ATTRIBUTION } from "@/lib/openfoodfacts"
import {
  searchWines,
  type WineapiSearchResult,
  WineapiError,
} from "@/lib/wineapi"

/**
 * POST /api/barcode/lookup
 * Body: { ean: string }   // 8-14 digits, no checksum validation
 *
 * Two-stage lookup:
 *   1. Open Food Facts (free, public, no key) -- gives us name/brand/country/image.
 *   2. If the user has a saved wineapiKey, run the OFF name through
 *      wineapi.io text search to surface structured wine candidates.
 *
 * Always returns 200 with a complete envelope:
 *   { ean, off, wineapiStatus, wineapiHits, attribution }
 *
 * The 200-always contract is deliberate: a missing wineapiKey or an
 * empty OFF row is NOT a failure. We let the client light up "Fant
 * EAN — prøv manuell utfylling" without throwing 400. Only a bad EAN
 * format returns 400 because that's a real client error.
 */

const EAN_RE = /^\d{8,14}$/

type LookupResponse = {
  ean: string
  off: Awaited<ReturnType<typeof lookupOffEan>>
  wineapiStatus: "hit" | "miss" | "no-key" | "error"
  wineapiHits: WineapiSearchResult[]
  wineapiError: string | null
  attribution: string
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = parseInt(session.user.id)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 })
  }
  const rawEan =
    body && typeof body === "object" && "ean" in body && typeof (body as { ean: unknown }).ean === "string"
      ? ((body as { ean: string }).ean ?? "").trim()
      : ""
  if (!EAN_RE.test(rawEan)) {
    return NextResponse.json(
      { error: "EAN må være 8–14 sifre" },
      { status: 400 },
    )
  }
  const ean = rawEan

  // Stage 1: Open Food Facts (free, no key).
  const off = await lookupOffEan(ean)

  // Stage 2: wineapi.io text-search enrichment. Only if the user has a
  // saved wineapiKey. We pass the OFF product_name as the query; if
  // OFF had nothing, fall back to the raw EAN (wineapi will probably
  // miss, but a 0-hit response is the same as "no hits" anyway).
  const queryForWineapi = off?.name ?? ean

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wineapiKey: true },
  })

  let wineapiStatus: LookupResponse["wineapiStatus"] = "no-key"
  let wineapiHits: WineapiSearchResult[] = []
  let wineapiError: string | null = null

  if (user?.wineapiKey) {
    try {
      const hits = await searchWines(user.wineapiKey, queryForWineapi, 5)
      wineapiHits = hits
      wineapiStatus = hits.length > 0 ? "hit" : "miss"
    } catch (e) {
      // WineapiError already carries status + diagnostic message -- we
      // surface its message back to the client so an auth/quota issue
      // shows up next to the scanner rather than as a generic toast.
      if (e instanceof WineapiError) {
        wineapiError = e.message
      } else {
        wineapiError = e instanceof Error ? e.message : "wineapi feilet"
      }
      wineapiStatus = "error"
    }
  }

  return NextResponse.json<LookupResponse>({
    ean,
    off,
    wineapiStatus,
    wineapiHits,
    wineapiError,
    attribution: OFF_ATTRIBUTION,
  })
}
