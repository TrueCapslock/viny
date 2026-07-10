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
// DELETE splits the shared MainList back to per-user lists. v0.15.1
// changed this from "caller takes their wines back" to "BOTH users get
// a copy of the entire shared list, and the shared list is deleted":
//
//   - For every user whose User.mainListId points at the shared list,
//     create a fresh "UseMainList" List row.
//   - Copy every ListWine row from the shared list onto each fresh
//     list, preserving wineId, inCellar, quantity, and addedAt. Wine
//     rows themselves are NOT duplicated (they stay shared at the
//     Wine level: metadata, images, tasting notes are still visible
//     to both users after the split; only the list membership is
//     independent).
//   - Repoint each sharer's User.mainListId at their fresh list.
//   - Delete the shared list. The ListWine rows on it cascade away;
//     Wine rows stay because they still have refs on the fresh lists.
//
// `friendUserId` is still accepted in the request body for backward
// compat with any in-flight client requests, but is ignored — the
// handler finds all sharers automatically.

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  // friendUserId is kept in the request body for backward compat with
  // the v0.15.0 endpoint contract (StopSharingDialog still sends it),
  // but the new behavior gives a copy to ALL sharers on the shared
  // list (not just one specific friend) so the field is ignored here.
  const body = await request.json().catch(() => ({})) as { friendUserId?: number }
  void body.friendUserId

  // All reads live INSIDE the transaction so a concurrent
  // split-click from the friend can't TOCTOU-race. If both reads
  // were outside, both callers would see N sharers, both would
  // try to create fresh lists, and the second tx would either
  // fail on a unique constraint or leave orphaned fresh lists
  // behind.
  await prisma.$transaction(async (tx) => {
    const me = await tx.user.findUnique({
      where: { id: userId },
      select: { mainListId: true },
    })
    if (!me?.mainListId) return

    // All users on the shared list (caller + others). A solo caller
    // (sharers.length <= 1) means the list is already unshared —
    // no-op.
    const sharers = await tx.user.findMany({
      where: { mainListId: me.mainListId },
      select: { id: true },
    })
    if (sharers.length <= 1) return

    // Read the shared list's ListWine rows ONCE at the top of the
    // transaction (not inside the sharer loop) so every copy sees
    // the same snapshot.
    //
    // Known race window (low priority, documented rather than fixed):
    // if a sharer POSTs to /api/viner *between* this read and the
    // tx.list.delete below, their new ListWine row lands on the
    // about-to-be-deleted shared list and gets cascade-deleted. The
    // friend would see a "wine added" toast but the wine would be
    // gone. The window is microseconds and READ COMMITTED isolation
    // doesn't prevent it; fixes (SERIALIZABLE, or re-reading
    // sharedListWines after the last mainListId repoint) trade
    // throughput for a tighter guarantee. Acceptable for now.
    const sharedListWines = await tx.listWine.findMany({
      where: { listId: me.mainListId },
      select: {
        wineId: true,
        inCellar: true,
        quantity: true,
        addedAt: true,
      },
    })

    for (const sharer of sharers) {
      const fresh = await tx.list.create({
        data: { name: "UseMainList", userId: sharer.id, isMain: true },
      })

      if (sharedListWines.length > 0) {
        await tx.listWine.createMany({
          data: sharedListWines.map((lw) => ({
            listId: fresh.id,
            wineId: lw.wineId,
            inCellar: lw.inCellar,
            quantity: lw.quantity,
            addedAt: lw.addedAt,
          })),
        })
      }

      await tx.user.update({
        where: { id: sharer.id },
        data: { mainListId: fresh.id },
      })
    }

    // Delete the shared list. The ListWine rows on it cascade away;
    // Wine rows are NOT cascade-deleted (they still have ListWine
    // refs on the fresh lists).
    await tx.list.delete({ where: { id: me.mainListId } })
  })

  return NextResponse.json({ success: true })
}
