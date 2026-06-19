import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const suggestion = await prisma.wineSuggestion.findUnique({
    where: { id: parseInt(id) },
  })
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (suggestion.toUserId !== userId && suggestion.fromUserId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.wineSuggestion.update({
    where: { id: suggestion.id },
    data: { status: "declined" },
  })

  return NextResponse.json({ success: true })
}
