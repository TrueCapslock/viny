import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const body = await request.json()

  const wine = await prisma.wine.findFirst({ where: { id: body.wineId, userId } })
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tasting = await prisma.tasting.create({
    data: {
      wineId: body.wineId,
      rating: body.rating || null,
      nose: body.nose || null,
      palate: body.palate || null,
      finish: body.finish || null,
      foodPairing: body.foodPairing || null,
      pricePaid: body.pricePaid || null,
      location: body.location || null,
    },
  })
  return NextResponse.json(tasting, { status: 201 })
}
