import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

async function getOwnedList(listId: number, userId: number) {
  const list = await prisma.list.findUnique({ where: { id: listId } })
  if (!list || list.userId !== userId) return null
  return list
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
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
              // take: 1 still extracts the latest tasting for the avg-rating
              // read. Add _count alongside so callers can show the real
              // total without the embed-array capping at 1.
              tastings: { orderBy: { date: "desc" }, take: 1 },
              _count: { select: { tastings: true } },
            },
          },
        },
      },
    },
  })

  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(list)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const existing = await getOwnedList(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const existing = await getOwnedList(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.list.delete({ where: { id: existing.id } })

  return NextResponse.json({ success: true })
}
