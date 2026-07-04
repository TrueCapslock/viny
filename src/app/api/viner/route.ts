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
  let isOwnView = true

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
      isOwnView = false
    }
    ownerId = targetId
  }

  // v0.14.0: the owner's Vinskapet is a per-user SharedList. Friends see the
  // Vinskapet wines; custom-list wines (userId=owner, sharedListId=NULL) are
  // owner-only.
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { defaultSharedListId: true },
  })

  // Shared lists where BOTH viewer and owner are members (explicit-shared-list
  // viewing from a friend's perspective).
  const coMemberedSharedLists = await prisma.sharedList.findMany({
    where: {
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: ownerId } } },
      ],
    },
    select: { id: true },
  })

  const wines = await prisma.wine.findMany({
    where: {
      OR: [
        // Own custom-list wines (always visible to self only).
        ...(isOwnView
          ? [{ userId: ownerId, sharedListId: null }]
          : []),
        // Owner's Vinskapet — visible to self, members, and the owner's friends.
        ...(owner?.defaultSharedListId
          ? [{ userId: ownerId, sharedListId: owner.defaultSharedListId }]
          : []),
        // Explicit shared lists where both this viewer and the owner are members.
        { sharedListId: { in: coMemberedSharedLists.map((sl) => sl.id) } },
      ],
    },
    include: { _count: { select: { tastings: true } } },
    orderBy: { createdAt: "desc" },
  })

  const winesWithRating = wines.length > 0
    ? await Promise.all(
        wines.map(async (wine) => {
          const result = await prisma.tasting.aggregate({
            where: { wineId: wine.id },
            _avg: { rating: true },
          })
          return { ...wine, avgRating: Math.round(result._avg.rating ?? 0) }
        }),
      )
    : []

  return NextResponse.json(winesWithRating)
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
      // v0.14.0: editors on someone else's cellar must now be a
      // SharedListMember of that user's Vinskapet (replace ListShare).
      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { defaultSharedListId: true },
      })
      if (!target?.defaultSharedListId) {
        return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 })
      }
      const isMember = await prisma.sharedListMember.findUnique({
        where: {
          sharedListId_userId: {
            sharedListId: target.defaultSharedListId,
            userId,
          },
        },
      })
      if (!isMember) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 })
    }
    ownerId = targetId
  }

  const body = await request.json()
  const ownerForSharedList = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { defaultSharedListId: true },
  })
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
      // v0.14.0: cellar wines live in the owner's Vinskapet (their default
      // SharedList); non-cellar wines start unshared and don't appear in
      // anyone else's view unless the owner explicitly adds them to a
      // SharedList later.
      sharedListId: body.inCellar ? ownerForSharedList?.defaultSharedListId ?? null : null,
    },
  })
  return NextResponse.json(wine, { status: 201 })
}
