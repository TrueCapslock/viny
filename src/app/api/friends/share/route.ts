import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// v0.14.0: the share button now adds the friend as a SharedListMember of my
// per-user Vinskapet (replaces the old ListShare editor-row model). Friend
// status still gates visibility, and only members can write into my cellar.
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

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultSharedListId: true },
  })
  if (!me?.defaultSharedListId) {
    return NextResponse.json({ error: "Vinskap ikke klar" }, { status: 409 })
  }

  const existing = await prisma.sharedListMember.findUnique({
    where: {
      sharedListId_userId: {
        sharedListId: me.defaultSharedListId,
        userId: friendUserId,
      },
    },
  })
  if (existing) return NextResponse.json({ error: "Deling finnes allerede" }, { status: 409 })

  await prisma.sharedListMember.create({
    data: { sharedListId: me.defaultSharedListId, userId: friendUserId, role: "member" },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId } = await request.json()

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultSharedListId: true },
  })
  if (!me?.defaultSharedListId) {
    return NextResponse.json({ success: true })
  }

  await prisma.sharedListMember.deleteMany({
    where: { sharedListId: me.defaultSharedListId, userId: friendUserId },
  })

  return NextResponse.json({ success: true })
}
