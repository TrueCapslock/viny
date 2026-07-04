import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { mergeMainlistsForShareInvite, MergeError } from "@/lib/list-merge"

type Params = Promise<{ id: string }>

/**
 * v0.15.1: POST /api/friends/share-invite/[id]/accept
 *
 * Only the recipient (toUserId) can accept. We resolve winner and
 * loser from the invite's stored `winner` enum:
 *   - winner="mine"   -> winnerUserId = invite.fromUserId
 *   - winner="theirs" -> winnerUserId = invite.toUserId
 *   - winner="merge"  -> winnerUserId = invite.fromUserId (inviter's
 *     list is the base; the invitee's wines are migrated in)
 *
 * The merge runs inside a single Prisma transaction so the invite's
 * status flip to "accepted" and the data-side merge are a single
 * atomic operation. `migrateLoserWines` was captured at invite time
 * and is passed verbatim into the helper — it's true for "merge"
 * (non-destructive) and false for "mine"/"theirs" (destructive).
 *
 * `mergeMainlistsForShareInvite` re-checks "winner mainListId != loser
 * mainListId" inside its tx body, so a concurrent split (DELETE
 * /api/friends/share) surfaces a 409 instead of corrupting the row;
 * the catch below translates MergeError into a JSON 409 response.
 */
export async function POST(_request: Request, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await params
  const inviteId = parseInt(id)

  const invite = await prisma.shareInvite.findUnique({
    where: { id: inviteId },
  })
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Allerede besvart" }, { status: 409 })
  }
  if (invite.toUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // "merge" uses the inviter as the base (consistent with "mine"); the
  // distinction is purely UI on the picker side.
  const winnerUserId =
    invite.winner === "theirs" ? invite.toUserId : invite.fromUserId
  const loserUserId =
    invite.winner === "theirs" ? invite.fromUserId : invite.toUserId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const merged = await mergeMainlistsForShareInvite(tx, {
        winnerUserId,
        loserUserId,
        migrateLoserWines: invite.migrateLoserWines,
      })
      await tx.shareInvite.update({
        where: { id: inviteId },
        data: { status: "accepted" },
      })
      return merged
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    if (e instanceof MergeError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
