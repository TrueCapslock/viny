import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

/**
 * v0.15.1: DELETE /api/friends/share-invite/[id]
 *
 * One verb, two semantics — differentiate by who is calling:
 *   - sender (fromUserId)            -> status="cancelled"
 *   - recipient (toUserId)           -> status="declined"
 *   - anyone else                    -> 403
 *
 * The row is kept (audit) with the terminal status; only "pending"
 * rows surface on /api/friends GET, so the UI effectively forgets the
 * row once it lands here. Cross-mirrors /api/forslag/[id]'s
 * invite-vs-decline de-duplication.
 */
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params
  const inviteId = parseInt(id)

  const invite = await prisma.shareInvite.findUnique({ where: { id: inviteId } })
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Allerede besvart" }, { status: 409 })
  }
  if (invite.fromUserId !== userId && invite.toUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const newStatus = invite.fromUserId === userId ? "cancelled" : "declined"

  await prisma.shareInvite.update({
    where: { id: inviteId },
    data: { status: newStatus },
  })

  return NextResponse.json({ success: true })
}
