import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

export async function PUT(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const friendship = await prisma.friend.findFirst({
    where: { id: parseInt(id), addresseeId: userId, status: "pending" },
  })
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.friend.update({
    where: { id: parseInt(id) },
    data: { status: "accepted" },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params

  const friendship = await prisma.friend.findFirst({
    where: {
      id: parseInt(id),
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  })
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.friend.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
