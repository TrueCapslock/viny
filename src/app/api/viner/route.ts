import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const wines = await prisma.wine.findMany({
    include: { _count: { select: { tastings: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(wines)
}

export async function POST(request: Request) {
  const body = await request.json()
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
    },
  })
  return NextResponse.json(wine, { status: 201 })
}
