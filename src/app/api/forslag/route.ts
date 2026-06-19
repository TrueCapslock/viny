import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  const received = await prisma.wineSuggestion.findMany({
    where: { toUserId: userId, status: "pending" },
    include: { fromUser: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  const sent = await prisma.wineSuggestion.findMany({
    where: { fromUserId: userId },
    include: { toUser: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ received, sent })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { toUserId, wineId, message } = await request.json()

  if (!toUserId || !wineId) {
    return NextResponse.json({ error: "Mangler mottaker eller vin" }, { status: 400 })
  }

  const toUser = parseInt(toUserId)
  if (toUser === userId) {
    return NextResponse.json({ error: "Kan ikke foreslå for deg selv" }, { status: 400 })
  }

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: toUser },
        { requesterId: toUser, addresseeId: userId },
      ],
    },
  })
  if (!isFriend) {
    return NextResponse.json({ error: "Du kan bare foreslå for venner" }, { status: 403 })
  }

  const wine = await prisma.wine.findUnique({ where: { id: parseInt(wineId) } })
  if (!wine) {
    return NextResponse.json({ error: "Vinen finnes ikke" }, { status: 404 })
  }

  const suggestion = await prisma.wineSuggestion.create({
    data: {
      fromUserId: userId,
      toUserId: toUser,
      wineId: wine.id,
      message: message || null,
      name: wine.name,
      producer: wine.producer,
      vintage: wine.vintage,
      varietal: wine.varietal,
      region: wine.region,
      country: wine.country,
      type: wine.type,
      notes: wine.notes,
      image: wine.image,
    },
  })

  return NextResponse.json(suggestion, { status: 201 })
}
