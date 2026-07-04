import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

/**
 * DELETE /api/friends/share-invite/[id]
 *
 * One verb, two semantics — differentiate by who is calling:
 *   - sender (fromUserId)            -> row deleted (was: status="cancelled")
 *   - recipient (toUserId)           -> row deleted (was: status="declined")
 *   - anyone else                    -> 403
 *
 * The row is hard-deleted on terminal state (cleaner alternative to the
 * earlier "keep for audit" status-flip which left lateral, dead rows in
 * the table). Only "pending" rows surface on /api/friends GET, so the
 * UI couldn't distinguish deleted vs status-flipped — the table no
 * longer grows unbounded across a long session of share → decline
 * cycles. Cross-mirrors /api/forslag/[id]'s invite-vs-decline
 * de-duplication.
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

  // Clean cleanup: drop the row. P2025 (already gone) is benign in the
  // race where a sibling request just deleted it — surface success
  // regardless so the client UI can refresh cleanly.
  await prisma.shareInvite.delete({ where: { id: inviteId } }).catch((e) => {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") return
    throw e
  })

  return NextResponse.json({ success: true })
}
