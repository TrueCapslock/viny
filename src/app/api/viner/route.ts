import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId")

  let ownerId = userId

  if (targetUserId) {
    const targetId = parseInt(targetUserId)
    if (targetId !== userId) {
      const isFriend = await prisma.friend.findFirst({
        where: {
          status: "accepted",
          OR: [
            { requesterId: userId, addresseeId: targetId },
            { requesterId: targetId, addresseeId: userId },
          ],
        },
      })
      if (!isFriend) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    ownerId = targetId
  }

  const sharedListIds = await prisma.sharedList.findMany({
    where: targetUserId
      ? {
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: ownerId } } },
          ],
        }
      : { members: { some: { userId } } },
    select: { id: true },
  })

  const wines = await prisma.wine.findMany({
    where: {
      OR: [
        { userId: ownerId, sharedListId: null },
        { sharedListId: { in: sharedListIds.map((sl) => sl.id) } },
      ],
    },
    include: { _count: { select: { tastings: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(wines)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId")

  let ownerId = userId

  if (targetUserId) {
    const targetId = parseInt(targetUserId)
    if (targetId !== userId) {
      const isEditor = await prisma.listShare.findUnique({
        where: { ownerId_editorId: { ownerId: targetId, editorId: userId } },
      })
      if (!isEditor) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 })
    }
    ownerId = targetId
  }

  const body = await request.json()
  const wine = await prisma.wine.create({
    data: {
      name: body.name,
      producer: body.producer,
      vintage: body.vintage ? parseInt(body.vintage) : null,
      varietal: body.varietal || null,
      region: body.region || null,
      country: body.country || null,
      type: body.type || null,
      notes: body.notes || null,
      image: body.image || null,
      inCellar: body.inCellar ?? false,
      quantity: body.inCellar ? parseInt(body.quantity) || 0 : 0,
      userId: ownerId,
    },
  })
  return NextResponse.json(wine, { status: 201 })
}
