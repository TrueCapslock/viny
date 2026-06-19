import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId } = await request.json()

  if (!friendUserId) return NextResponse.json({ error: "Mangler bruker-ID" }, { status: 400 })

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: friendUserId },
        { requesterId: friendUserId, addresseeId: userId },
      ],
    },
  })
  if (!isFriend) return NextResponse.json({ error: "Ikke venner med denne brukeren" }, { status: 403 })

  const existing = await prisma.listShare.findUnique({
    where: { ownerId_editorId: { ownerId: userId, editorId: friendUserId } },
  })
  if (existing) return NextResponse.json({ error: "Deling finnes allerede" }, { status: 409 })

  await prisma.listShare.create({
    data: { ownerId: userId, editorId: friendUserId },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId } = await request.json()

  await prisma.listShare.deleteMany({
    where: { ownerId: userId, editorId: friendUserId },
  })

  return NextResponse.json({ success: true })
}
