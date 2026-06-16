import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) return null
  return parseInt(session.user.id)
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wine = await prisma.wine.findFirst({
    where: { id: parseInt(id), userId },
    include: { tastings: { orderBy: { date: "desc" } } },
  })
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(wine)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.wine.findFirst({ where: { id: parseInt(id), userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  console.log("Updating wine", {
    id,
    userId,
    hasImage: Boolean(body.image),
    image: body.image,
  })
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
    },
  })
  return NextResponse.json(wine)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.wine.findFirst({ where: { id: parseInt(id), userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.wine.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
