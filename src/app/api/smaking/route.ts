import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const body = await request.json()

  const wine = await prisma.wine.findUnique({ where: { id: body.wineId } })
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (wine.userId !== userId) {
    const isEditor = await prisma.listShare.findUnique({
      where: { ownerId_editorId: { ownerId: wine.userId, editorId: userId } },
    })
    if (isEditor) {
      // ok
    } else if (wine.sharedListId) {
      const isMember = await prisma.sharedListMember.findUnique({
        where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
      })
      if (!isMember) return NextResponse.json({ error: "Not found" }, { status: 404 })
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

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
