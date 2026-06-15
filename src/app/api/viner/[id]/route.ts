import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params
  const wine = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { tastings: { orderBy: { date: "desc" } } },
  })
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(wine)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = await params
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
    },
  })
  return NextResponse.json(wine)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { id } = await params
  await prisma.wine.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
