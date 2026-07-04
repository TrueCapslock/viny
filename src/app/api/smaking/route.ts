import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// v0.15.0: write access is
//   - the wine's creator (Wine.userId), OR
//   - any user whose MainList contains the wine (ListWine.listId = user.mainListId).
// Custom Lists that pin someone else's wine do NOT grant write access —
// the read-shape "asymmetric reference" pattern.
async function canPostTasting(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } })
  if (!wine) return false
  if (wine.userId === userId) return true

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) return false
  const lw = await prisma.listWine.findUnique({
    where: { listId_wineId: { listId: me.mainListId, wineId } },
  })
  return lw !== null
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const body = await request.json()

  const ok = await canPostTasting(body.wineId, userId)
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tasting = await prisma.tasting.create({
    data: {
      wineId: body.wineId,
      rating: body.rating || null,
      nose: body.nose?.trim() || null,
      palate: body.palate?.trim() || null,
      finish: body.finish?.trim() || null,
      foodPairing: body.foodPairing?.trim() || null,
      pricePaid: body.pricePaid || null,
      location: body.location?.trim() || null,
      comment: body.comment?.trim() || null,
    },
  })
  return NextResponse.json(tasting, { status: 201 })
}
