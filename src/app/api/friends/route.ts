import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  const sent = await prisma.friend.findMany({
    where: { requesterId: userId },
    include: { addressee: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  const received = await prisma.friend.findMany({
    where: { addresseeId: userId },
    include: { requester: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  const editors = await prisma.listShare.findMany({
    where: { ownerId: userId },
    include: { editor: { select: { id: true, name: true, email: true, image: true } } },
  })

  const editorIds = new Set(editors.map((e) => e.editorId))

  const friends = [
    ...sent.filter((f) => f.status === "accepted").map((f) => ({
      id: f.id,
      userId: f.addressee.id,
      name: f.addressee.name,
      email: f.addressee.email,
      image: f.addressee.image,
      status: "accepted" as const,
      canEdit: editorIds.has(f.addressee.id),
    })),
    ...received.filter((f) => f.status === "accepted").map((f) => ({
      id: f.id,
      userId: f.requester.id,
      name: f.requester.name,
      email: f.requester.email,
      image: f.requester.image,
      status: "accepted" as const,
      canEdit: editorIds.has(f.requester.id),
    })),
  ]

  const pendingSent = sent.filter((f) => f.status === "pending").map((f) => ({
    id: f.id,
    userId: f.addressee.id,
    name: f.addressee.name,
    email: f.addressee.email,
    image: f.addressee.image,
    direction: "sent" as const,
  }))

  const pendingReceived = received.filter((f) => f.status === "pending").map((f) => ({
    id: f.id,
    userId: f.requester.id,
    name: f.requester.name,
    email: f.requester.email,
    image: f.requester.image,
    direction: "received" as const,
  }))

  return NextResponse.json({ friends, pendingSent, pendingReceived })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { email } = await request.json()

  if (!email) return NextResponse.json({ error: "E-post er påkrevd" }, { status: 400 })
  if (email === session.user.email) return NextResponse.json({ error: "Du kan ikke legge til deg selv" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { email } })
  if (!target) return NextResponse.json({ error: "Fant ingen bruker med den e-posten" }, { status: 404 })

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  })
  if (existing) return NextResponse.json({ error: "Vennskap finnes allerede" }, { status: 409 })

  const friendship = await prisma.friend.create({
    data: { requesterId: userId, addresseeId: target.id },
  })

  return NextResponse.json({ id: friendship.id }, { status: 201 })
}
