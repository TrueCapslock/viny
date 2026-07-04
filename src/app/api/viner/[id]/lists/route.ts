import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

// v0.15.0: canAccessWine is ListWine-membership + friend-peek based.
async function canAccessWine(wineId: number, userId: number) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })

  // Caller already has the wine on any of their lists.
  const onMyLists = await prisma.listWine.findFirst({
    where: {
      wineId,
      OR: [
        { listId: me?.mainListId ?? -1 },
        { list: { userId, isMain: false } },
      ],
    },
    select: { listId: true },
  })
  if (onMyLists) return true

  // Friend peek: wine is in owner's MainList, I'm their friend.
  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { userId: true },
  })
  if (!wine) return false

  const owner = await prisma.user.findUnique({
    where: { id: wine.userId },
    select: { mainListId: true },
  })
  if (!owner?.mainListId) return false
  const onOwnersMainList = await prisma.listWine.findUnique({
    where: { listId_wineId: { listId: owner.mainListId, wineId } },
  })
  if (!onOwnersMainList) return false

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: wine.userId },
        { requesterId: wine.userId, addresseeId: userId },
      ],
    },
  })
  return isFriend !== null
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params
  const wineId = parseInt(id)

  // v0.15.0: only Custom Lists (isMain=false) OWNED BY CALLER. The
  // MainList is not a "Custom List" — it's the user's own home cellar.
  const memberships = await prisma.listWine.findMany({
    where: {
      wineId,
      list: { userId, isMain: false },
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

  const ok = await canAccessWine(wineId, userId)
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { listId } = await request.json()
  if (!listId) return NextResponse.json({ error: "Mangler liste" }, { status: 400 })

  // v0.15.0: caller must own the list AND it must be a Custom List.
  const list = await prisma.list.findUnique({ where: { id: parseInt(listId) } })
  if (!list || list.isMain || list.userId !== userId) {
    return NextResponse.json({ error: "Liste ikke funnet" }, { status: 404 })
  }

  await prisma.listWine.upsert({
    where: { listId_wineId: { listId: list.id, wineId } },
    create: { listId: list.id, wineId },
    update: {},
  })

  return NextResponse.json({ success: true, listId: list.id, wineId })
}
