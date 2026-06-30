import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string; listId: string }>

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id, listId } = await params
  const wineId = parseInt(id)
  const listIdNum = parseInt(listId)

  const list = await prisma.list.findUnique({ where: { id: listIdNum } })
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Liste ikke funnet" }, { status: 404 })
  }

  await prisma.listWine.delete({
    where: { listId_wineId: { listId: listIdNum, wineId } },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
