import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  const sent = await prisma.friend.findMany({
    where: { requesterId: userId },
    include: { addressee: { select: { id: true, name: true, email: true, image: true, mainListId: true } } },
    orderBy: { createdAt: "desc" },
  })

  const received = await prisma.friend.findMany({
    where: { addresseeId: userId },
    include: { requester: { select: { id: true, name: true, email: true, image: true, mainListId: true } } },
    orderBy: { createdAt: "desc" },
  })

  // v0.15.0: canEdit / sharedMainList: caller and friend point at the
  // same `User.mainListId` (= the same List row, i.e. they've merged).
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  const myMainListId = me?.mainListId ?? null

  const friends = [
    ...sent.filter((f) => f.status === "accepted").map((f) => ({
      id: f.id,
      userId: f.addressee.id,
      name: f.addressee.name,
      email: f.addressee.email,
      image: f.addressee.image,
      status: "accepted" as const,
      canEdit: !!myMainListId && f.addressee.mainListId === myMainListId,
      sharedMainList: !!myMainListId && f.addressee.mainListId === myMainListId,
      // legacy alias kept so existing UI keeps rendering; both flags
      // collapse to the same v0.15.0 condition.
      sharedList: !!myMainListId && f.addressee.mainListId === myMainListId,
    })),
    ...received.filter((f) => f.status === "accepted").map((f) => ({
      id: f.id,
      userId: f.requester.id,
      name: f.requester.name,
      email: f.requester.email,
      image: f.requester.image,
      status: "accepted" as const,
      canEdit: !!myMainListId && f.requester.mainListId === myMainListId,
      sharedMainList: !!myMainListId && f.requester.mainListId === myMainListId,
      sharedList: !!myMainListId && f.requester.mainListId === myMainListId,
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

  // v0.15.0: SharedList concept retired. `sharedLists` in the response
  // shape is historically consumed by the UI; we emit an empty array to
  // keep the contract stable. Phase-3 UI rewrite will drop the field.
  return NextResponse.json({
    friends,
    pendingSent,
    pendingReceived,
    sharedLists: [],
  })
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
