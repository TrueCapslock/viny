import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@/generated/prisma/client"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId, mode } = await request.json()

  if (!friendUserId || !["mine", "theirs", "merge"].includes(mode)) {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 })
  }

  const friendId = parseInt(friendUserId)
  if (friendId === userId) {
    return NextResponse.json({ error: "Kan ikke dele med deg selv" }, { status: 400 })
  }

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  })
  if (!isFriend) {
    return NextResponse.json({ error: "Ikke venner med denne brukeren" }, { status: 403 })
  }

  const existingShared = await prisma.sharedList.findFirst({
    where: {
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: friendId } } },
      ],
    },
  })
  if (existingShared) {
    return NextResponse.json({ error: "Dere deler allerede en liste" }, { status: 409 })
  }

  const [myName, friendName] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: friendId }, select: { name: true } }),
  ])

  const sharedList = await prisma.sharedList.create({
    data: {
      name: `${myName?.name ?? "Bruker"} & ${friendName?.name ?? "Bruker"}`,
      members: {
        create: [
          { userId, role: "admin" },
          { userId: friendId, role: "member" },
        ],
      },
    },
  })

  let where: Prisma.WineWhereInput
  if (mode === "mine") {
    where = { userId, sharedListId: null }
  } else if (mode === "theirs") {
    where = { userId: friendId, sharedListId: null }
  } else {
    where = {
      OR: [
        { userId, sharedListId: null },
        { userId: friendId, sharedListId: null },
      ],
    }
  }

  await prisma.wine.updateMany({
    where,
    data: { sharedListId: sharedList.id },
  })

  return NextResponse.json({ id: sharedList.id, name: sharedList.name }, { status: 201 })
}
