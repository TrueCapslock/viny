import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * v0.15.1: list-share is now invite-then-accept.
 *
 * POST /api/friends/share-invite
 *   body: { friendUserId, winner: "mine"|"theirs" }
 *
 * Sender creates a pending ShareInvite row. Cross-checks:
 *   - accepted friendship with the target;
 *   - both users have MainList;
 *   - both users do NOT already share a MainList (409).
 *
 * Any existing pending invite from sender -> target is *replaced* (tx:
 * deleteMany(pending)+create), so the winner picker is idempotent
 * across re-submissions; terminal invite rows (accepted | declined |
 * cancelled) are kept for audit. Caller must pick a single winner per
 * pair across the lifetime of the session — that's why the picker is
 * modal, not persistently configurable.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId, winner } = (await request.json()) as {
    friendUserId: number
    winner: "mine" | "theirs"
  }

  if (!friendUserId || (winner !== "mine" && winner !== "theirs")) {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 })
  }
  if (friendUserId === userId) {
    return NextResponse.json({ error: "Kan ikke dele med deg selv" }, { status: 400 })
  }

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: friendUserId },
        { requesterId: friendUserId, addresseeId: userId },
      ],
    },
  })
  if (!isFriend) {
    return NextResponse.json({ error: "Ikke venner med denne brukeren" }, { status: 403 })
  }

  const [me, friend] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { mainListId: true } }),
    prisma.user.findUnique({ where: { id: friendUserId }, select: { mainListId: true } }),
  ])
  if (!me?.mainListId || !friend?.mainListId) {
    return NextResponse.json({ error: "Hovedlister ikke klare" }, { status: 409 })
  }
  if (me.mainListId === friend.mainListId) {
    return NextResponse.json({ error: "Dere deler allerede en liste" }, { status: 409 })
  }

  // Race-safe replace: delete pending invite(s) from sender->target,
  // then create a fresh one. No @@unique constraint on the pair, so
  // we co-order pending rows out before inserting to keep the UI
  // invariant "at most one pending invite per pair". Terminal rows
  // (accepted | declined | cancelled) are preserved for audit.
  const invite = await prisma.$transaction(async (tx) => {
    await tx.shareInvite.deleteMany({
      where: {
        fromUserId: userId,
        toUserId: friendUserId,
        status: "pending",
      },
    })
    return tx.shareInvite.create({
      data: {
        fromUserId: userId,
        toUserId: friendUserId,
        winner,
        migrateLoserWines: true,
        status: "pending",
      },
    })
  })

  return NextResponse.json(invite, { status: 201 })
}
