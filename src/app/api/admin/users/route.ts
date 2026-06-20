import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } })
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
      prefersBeer: true,
      createdAt: true,
      _count: { select: { wines: true } },
    },
  })

  return NextResponse.json(users)
}
