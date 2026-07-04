import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

// v0.14.0: same as /api/viner/[id]/route.ts's canAccessWine.
async function canAccessWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: { user: { select: { defaultSharedListId: true } } },
  })
  if (!wine) return null
  if (wine.userId === userId) return wine

  if (wine.sharedListId) {
    const isMember = await prisma.sharedListMember.findUnique({
      where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
    })
    if (isMember) return wine
  }

  if (
    wine.sharedListId &&
    wine.sharedListId === wine.user.defaultSharedListId
  ) {
    const isFriend = await prisma.friend.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId, addresseeId: wine.userId },
          { requesterId: wine.userId, addresseeId: userId },
        ],
      },
    })
    if (isFriend) return wine
  }

  return null
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params
  const wineId = parseInt(id)

  const memberships = await prisma.listWine.findMany({
    where: {
      wineId,
      list: { userId },
    },
    select: { listId: true },
  })

  return NextResponse.json({ listIds: memberships.map((m) => m.listId) })
}

export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params
  const wineId = parseInt(id)

  const wine = await canAccessWine(wineId, userId)
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { listId } = await request.json()
  if (!listId) return NextResponse.json({ error: "Mangler liste" }, { status: 400 })

  const list = await prisma.list.findUnique({ where: { id: parseInt(listId) } })
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Liste ikke funnet" }, { status: 404 })
  }

  await prisma.listWine.upsert({
    where: { listId_wineId: { listId: list.id, wineId } },
    create: { listId: list.id, wineId },
    update: {},
  })

  return NextResponse.json({ success: true, listId: list.id, wineId })
}
