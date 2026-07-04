import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

async function getUserId(): Promise<number | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return parseInt(session.user.id)
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const listId = parseInt(id)

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      wines: {
        orderBy: { addedAt: "desc" },
        include: {
          wine: {
            include: {
              tastings: { orderBy: { date: "desc" }, take: 1 },
              _count: { select: { tastings: true } },
              inLists: { select: { listId: true, inCellar: true, quantity: true } },
            },
          },
        },
      },
    },
  })

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // v0.15.0 access:
  //   - Custom List (isMain=false): owner only.
  //   - MainList (isMain=true): any user whose User.mainListId points at
  //     this row (which includes owner + share-merge sharers).
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  const canSee =
    (list.isMain && me?.mainListId === list.id) ||
    (!list.isMain && list.userId === userId)
  if (!canSee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(list)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const listId = parseInt(id)

  const existing = await prisma.list.findUnique({ where: { id: listId } })
  if (!existing || existing.isMain) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name } = await request.json()
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Mangler navn" }, { status: 400 })
  }

  const list = await prisma.list.update({
    where: { id: existing.id },
    data: { name: name.trim().slice(0, 80) },
  })

  return NextResponse.json(list)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const listId = parseInt(id)

  const existing = await prisma.list.findUnique({ where: { id: listId } })
  if (!existing || existing.isMain) {
    // v0.15.0: never let a user DELETE their own MainList via this
    // endpoint. (They "delete" by re-pointing mainListId to a fresh
    // MainList — that's the share-merge inverse.)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.list.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
