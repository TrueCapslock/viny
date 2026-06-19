import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) return null
  return parseInt(session.user.id)
}

async function canAccessWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } })
  if (!wine) return null
  if (wine.userId === userId) return wine

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

  return null
}

async function canEditWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } })
  if (!wine) return null
  if (wine.userId === userId) return wine

  const isEditor = await prisma.listShare.findUnique({
    where: { ownerId_editorId: { ownerId: wine.userId, editorId: userId } },
  })
  if (isEditor) return wine

  return null
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wine = await canAccessWine(parseInt(id), userId)
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const full = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { tastings: { orderBy: { date: "desc" } } },
  })
  return NextResponse.json(full)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
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
    },
  })
  return NextResponse.json(wine)
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
    data: {
      inCellar: body.inCellar ?? false,
      quantity: body.inCellar ? parseInt(body.quantity) || 0 : 0,
    },
  })
  return NextResponse.json(wine)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.wine.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
