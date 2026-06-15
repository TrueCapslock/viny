import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.json()
  const tasting = await prisma.tasting.create({
    data: {
      wineId: body.wineId,
      rating: body.rating || null,
      nose: body.nose || null,
      palate: body.palate || null,
      finish: body.finish || null,
      foodPairing: body.foodPairing || null,
      pricePaid: body.pricePaid || null,
      location: body.location || null,
    },
  })
  return NextResponse.json(tasting, { status: 201 })
}
