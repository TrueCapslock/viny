import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  // v0.15.0: Custom Lists only (isMain=false). MainList is surfaced
  // through the home page (/api/viner) — not through this endpoint.
  const lists = await prisma.list.findMany({
    where: { userId, isMain: false },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { wines: true } } },
  })

  return NextResponse.json(lists)
}

// v0.15.0: a wine is accessible to caller via ListWine membership OR
// friendship-peek of the owner's MainList.
async function canAccessWine(wineId: number, userId: number) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })

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

  // Friend peek: wine is in owner's MainList AND I'm their friend.
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

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { name, addWineId } = await request.json()

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Mangler navn" }, { status: 400 })
  }

  const trimmed = name.trim().slice(0, 80)

  const list = await prisma.list.create({
    data: { name: trimmed, userId, isMain: false },
  })

  if (addWineId !== undefined) {
    const wineId = parseInt(addWineId)
    const ok = await canAccessWine(wineId, userId)
    if (ok) {
      try {
        await prisma.listWine.create({ data: { listId: list.id, wineId } })
      } catch {
        // duplicate (wine already in list); ignore.
      }
    }
  }

  const out = await prisma.list.findUnique({
    where: { id: list.id },
    include: { _count: { select: { wines: true } } },
  })

  return NextResponse.json(out, { status: 201 })
}
