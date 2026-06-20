import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

export async function POST(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const suggestion = await prisma.wineSuggestion.findUnique({
    where: { id: parseInt(id) },
  })
  if (!suggestion || suggestion.toUserId !== userId || suggestion.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const wine = await prisma.wine.create({
    data: {
      name: suggestion.name,
      producer: suggestion.producer,
      vintage: suggestion.vintage,
      varietal: suggestion.varietal,
      region: suggestion.region,
      country: suggestion.country,
      type: suggestion.type,
      notes: suggestion.notes,
      image: suggestion.image,
      userId,
    },
  })

  await prisma.wineSuggestion.delete({
    where: { id: suggestion.id },
  })

  return NextResponse.json(wine, { status: 201 })
}
