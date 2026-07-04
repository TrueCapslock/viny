import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = Promise<{ id: string }>

export async function PATCH(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } })
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id)
  const { prefersBeer } = await _request.json()

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { prefersBeer },
    select: { id: true, prefersBeer: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
  }

  const currentUserId = parseInt(session.user.id)
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } })
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id)

  if (userId === currentUserId) {
    return NextResponse.json({ error: "Kan ikke slette deg selv" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { wines: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 })
  }

  // Set mainListId to null before deleting — the column has no FK constraint
  // so Prisma won't enforce it, but it's cleaner to clear the reference.
  await prisma.user.update({
    where: { id: userId },
    data: { mainListId: null },
  })

  // Cascade handles: wines (with tastings), friendships, suggestions,
  // share-invites, password-reset tokens.
  // List.userId has onDelete: SetNull — lists survive with null userId.
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ success: true })
}
