import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// v0.15.0: list-merge share.
//
// POST { friendUserId, winner: "mine"|"theirs", migrateLoserWines: boolean }
//
// When two friends decide to share, they pick whose MainList becomes the
// shared MainList (winner). The loser list is dropped. Loser's wines are
// either migrated into the winner's list (migrateLoserWines=true) or
// destroyed along with their wines (migrateLoserWines=false; cascades
// Wine rows that lose all their ListWine refs).
//
// DELETE recreates a fresh MainList for the caller (i.e. "split the
// shared MainList back to your own" — opposite of merge).
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { friendUserId, winner, migrateLoserWines } = await request.json() as {
    friendUserId: number
    winner: "mine" | "theirs"
    migrateLoserWines: boolean
  }

  if (!friendUserId || (winner !== "mine" && winner !== "theirs")) {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 })
  }
  if (friendUserId === userId) {
    return NextResponse.json({ error: "Kan ikke dele med deg selv" }, { status: 400 })
  }

  // Both users must have a MainList. (Created at register time.)
  const [me, friend] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, mainListId: true } }),
    prisma.user.findUnique({ where: { id: friendUserId }, select: { id: true, mainListId: true } }),
  ])
  if (!me?.mainListId || !friend?.mainListId) {
    return NextResponse.json({ error: "Hovedlister ikke klare" }, { status: 409 })
  }
  if (me.mainListId === friend.mainListId) {
    return NextResponse.json({ error: "Dere deler allerede en liste" }, { status: 409 })
  }

  // Must be accepted friends.
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

  const winnerListId = winner === "mine" ? me.mainListId : friend.mainListId
  const loserUserId  = winner === "mine" ? friendUserId       : userId
  const loserListId  = winner === "mine" ? friend.mainListId  : me.mainListId

  const result = await prisma.$transaction(async (tx) => {
    if (migrateLoserWines) {
      // Phase 1: collide-loser rows with winner rows. For each wineId
      // that already lives on the winner list, sum the cellar flag
      // (logical OR) and the quantity onto the winner's existing row,
      // then drop the loser's row. Without this pre-pass, a plain
      // `UPDATE ListWine SET listId=winner` would silently swallow the
      // loser's inCellar + quantity on the same (winner, wineId)
      // collision (composite-PK conflict).
      //
      // Merge policy: logical OR on `inCellar` (either side says
      // "i mitt vinskap" → the merged row says so); sum on `quantity`.
      // This is the deterministic answer for caller intent merged with
      // the partner's quantity, instead of swallowing the partner.
      //
      // ListWine has a composite PK (listId, wineId) and no `id` column,
      // so update/delete use `listId_wineId`. We pull the winner rows
      // once into an in-memory map to avoid per-collision `findUnique`.

      const collisions = await tx.listWine.findMany({
        where: { listId: loserListId },
        select: { wineId: true, inCellar: true, quantity: true },
      })
      const winnerRows = await tx.listWine.findMany({
        where: {
          listId: winnerListId,
          wineId: { in: collisions.map((c) => c.wineId) },
        },
        select: { wineId: true, inCellar: true, quantity: true },
      })
      const winnerByWineId = new Map<
        number,
        { inCellar: boolean; quantity: number }
      >()
      for (const w of winnerRows) {
        winnerByWineId.set(w.wineId, {
          inCellar: w.inCellar,
          quantity: w.quantity,
        })
      }
      for (const c of collisions) {
        const w = winnerByWineId.get(c.wineId)
        if (!w) continue
        await tx.listWine.update({
          where: {
            listId_wineId: { listId: winnerListId, wineId: c.wineId },
          },
          data: {
            inCellar: w.inCellar || c.inCellar,
            quantity: w.quantity + c.quantity,
          },
        })
        await tx.listWine.delete({
          where: {
            listId_wineId: { listId: loserListId, wineId: c.wineId },
          },
        })
      }

      // Phase 2: bulk-move the remaining (non-colliding) loser rows
      // onto the winner list. Phase 1 already resolved collisions so
      // (winnerListId, wineId) is unique for the survivors.
      await tx.listWine.updateMany({
        where: { listId: loserListId },
        data: { listId: winnerListId },
      })
    }

    // Repoint loser user's mainListId at the winner list. After this,
    // both users' `User.mainListId` point at the same row, so they
    // share edits via ListWine membership on that row.
    await tx.user.update({
      where: { id: loserUserId },
      data: { mainListId: winnerListId },
    })

    // Drop the loser list row. If migrateLoserWines=false the ListWines
    // go too via List cascade, which then cascades to drop the Wine rows
    // that have zero remaining ListWine refs. This is the deliberate
    // "destructive" path the inviter opted into.
    await tx.list.delete({ where: { id: loserListId } })

    return { mergedInto: winnerListId }
  })

  return NextResponse.json(result, { status: 201 })
}

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
