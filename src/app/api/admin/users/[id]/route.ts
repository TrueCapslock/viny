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
