import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// v0.15.1: list-share is invite-then-accept.
//
// POST /api/friends/share is REMOVED. The merge can no longer be
// triggered externally; the inviter now creates a pending ShareInvite
// via POST /api/friends/share-invite and the merge happens only when
// the recipient accepts via POST /api/friends/share-invite/[id]/accept.
// The merge tx body lives in /src/lib/list-merge.ts and is invoked from
// the accept route.
//
// DELETE recreates a fresh MainList for the caller (i.e. "split the
// shared MainList back to your own" — opposite of merge).

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId } = await request.json() as { friendUserId: number }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) {
    return NextResponse.json({ success: true })
  }

  // Find the other sharers on the same MainList.
  const sharers = await prisma.user.findMany({
    where: { mainListId: me.mainListId, NOT: { id: userId } },
    select: { id: true },
  })

  // If caller has no sharers, the listing was already solo — no-op.
  if (sharers.length === 0) {
    return NextResponse.json({ success: true })
  }

  // Recreate a fresh MainList for the caller; move the caller's wines off
  // the shared list. The other sharers retain the shared MainList.
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.list.create({
      data: { name: "UseMainList", userId, isMain: true },
    })

    // Move every ListWine on the shared MainList whose Wine is owned by
    // the caller (or pinned by the caller on their MainList) onto the
    // fresh MainList.
    await tx.$executeRawUnsafe(
      `UPDATE "ListWine"
         SET "listId" = $1
       WHERE "listId" = $2
         AND "wineId" IN (
           SELECT id FROM "Wine" WHERE "userId" = $3
         )`,
      fresh.id,
      me.mainListId,
      userId,
    )

    await tx.user.update({
      where: { id: userId },
      data: { mainListId: fresh.id },
    })
  })

  // Also delete friend share for completeness; ignore if missing.
  void friendUserId

  return NextResponse.json({ success: true })
}
