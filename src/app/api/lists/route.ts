import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  const lists = await prisma.list.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { wines: true } } },
  })

  return NextResponse.json(lists)
}

async function canAccessWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } })
  if (!wine) return null
  if (wine.userId === userId) return wine

  if (!wine.sharedListId) {
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

  if (wine.sharedListId) {
    const isMember = await prisma.sharedListMember.findUnique({
      where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
    })
    if (isMember) return wine
  }

  return null
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
    data: { name: trimmed, userId },
  })

  if (addWineId !== undefined) {
    const wineId = parseInt(addWineId)
    const wine = await canAccessWine(wineId, userId)
    if (wine) {
      const listId = list.id
      try {
        await prisma.listWine.create({ data: { listId, wineId } })
      } catch {
        // ignore — already in list
      }
    }
  }

  const out = await prisma.list.findUnique({
    where: { id: list.id },
    include: { _count: { select: { wines: true } } },
  })

  return NextResponse.json(out, { status: 201 })
}
