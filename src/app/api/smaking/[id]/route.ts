import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canEditWine } from "@/lib/access"

type Params = Promise<{ id: string }>

/**
 * v0.19.0: edit + delete a single Tasting.
 *
 * `Tasting` has no `userId` column — tastings belong to the Wine, not to
 * an individual user. Access is therefore "anyone who can edit the
 * wine can edit any of its tastings", i.e. `canEditWine(wineId, caller)`.
 * That's the same gate `POST /api/smaking` uses (the duplicate inline
 * `canPostTasting` there predates src/lib/access.ts but is logically the
 * same predicate).
 *
 * Both PUT and DELETE return `{ error: "Not found" }, { status: 404 }`
 * on access denial — same leak-prevention pattern as the POST route.
 * A 403 here would let a caller probe tasting ids by trial.
 */
export async function PUT(
  request: Request,
  { params }: { params: Params },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = parseInt(session.user.id)
  const { id } = await params
  const tastingId = parseInt(id)
  if (Number.isNaN(tastingId)) {
    return NextResponse.json({ error: "Ugyldig id" }, { status: 400 })
  }

  const existing = await prisma.tasting.findUnique({
    where: { id: tastingId },
    select: { id: true, wineId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!(await canEditWine(existing.wineId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({})) as Partial<{
    rating: number | null
    date: string | null
    nose: string | null
    palate: string | null
    finish: string | null
    foodPairing: string | null
    pricePaid: number | null
    location: string | null
    comment: string | null
  }>

  // Trim/sanitize every field identically to POST /api/smaking so the
  // edit dialog and the create dialog return the same wire shape.
  // `date` is optional — pass it as YYYY-MM-DD from a <input type="date">;
  // when omitted, the existing date is preserved.
  const updated = await prisma.tasting.update({
    where: { id: tastingId },
    data: {
      ...(body.date ? { date: new Date(body.date) } : {}),
      rating: body.rating || null,
      nose: body.nose?.trim() || null,
      palate: body.palate?.trim() || null,
      finish: body.finish?.trim() || null,
      foodPairing: body.foodPairing?.trim() || null,
      pricePaid:
        body.pricePaid === null || body.pricePaid === undefined
          ? null
          : Number(body.pricePaid) || null,
      location: body.location?.trim() || null,
      comment: body.comment?.trim() || null,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = parseInt(session.user.id)
  const { id } = await params
  const tastingId = parseInt(id)
  if (Number.isNaN(tastingId)) {
    return NextResponse.json({ error: "Ugyldig id" }, { status: 400 })
  }

  const existing = await prisma.tasting.findUnique({
    where: { id: tastingId },
    select: { id: true, wineId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!(await canEditWine(existing.wineId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.tasting.delete({ where: { id: tastingId } })
  return NextResponse.json({ success: true })
}
