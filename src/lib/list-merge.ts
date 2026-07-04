import { Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

/**
 * v0.15.1: extract the share-merge tx body from /api/friends/share so the
 * same logic can be invoked from /api/friends/share-invite/[id]/accept.
 *
 * Two important contracts the helper preserves that the route layer used
 * to enforce out-of-band:
 *
 *   1. The "winner mainListId != loser mainListId" precondition is
 *      re-checked *inside* the tx body, against a fresh fetch. A
 *      concurrent DELETE /api/friends/share (split) on the same pair
 *      between accept-pre-check and tx execution would otherwise
 *      silently repoint a User.mainListId onto a row that no longer
 *      exists in the join graph. By re-fetching inside the tx we either
 *      bail with a 409 (still distinct) or throw MergeError(409) on a
 *      race.
 *
 *   2. `migrateLoserWines` is honored as the safe default; collisions
 *      onto the winner list are summed (logical OR on inCellar, add on
 *      quantity) so neither side's cellar state is silently swallowed.
 *      The destructive path (`migrateLoserWines: false`) is reserved for
 *      future "slett vennens" flow; not yet callable from any UI.
 */
export class MergeError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

export async function mergeMainlistsForShareInvite(
  tx: Tx,
  args: {
    winnerUserId: number
    loserUserId: number
    migrateLoserWines: boolean
  },
): Promise<{ mergedInto: number }> {
  // Re-resolve inside the tx so a concurrent split-recreate between
  // accept-pre-check and tx execution surfaces a 409 instead of pointing
  // a User.mainListId at a row that no longer joins the pair.
  const [winnerRow, loserRow] = await Promise.all([
    tx.user.findUnique({
      where: { id: args.winnerUserId },
      select: { mainListId: true },
    }),
    tx.user.findUnique({
      where: { id: args.loserUserId },
      select: { mainListId: true },
    }),
  ])
  if (!winnerRow?.mainListId || !loserRow?.mainListId) {
    throw new MergeError("Hovedlister ikke klare", 409)
  }
  if (winnerRow.mainListId === loserRow.mainListId) {
    throw new MergeError("Dere deler allerede en liste", 409)
  }

  const winnerListId = winnerRow.mainListId
  const loserListId = loserRow.mainListId

  if (args.migrateLoserWines) {
    // Phase 1: collide-loser rows with winner rows. For each wineId that
    // already lives on the winner list, sum the cellar flag (logical OR)
    // and quantity onto the winner's existing row, then drop the loser's
    // row. Without this pre-pass, a plain `UPDATE ListWine SET
    // listId=winner` would silently swallow the loser's inCellar +
    // quantity on the same (winner, wineId) collision
    // (composite-PK conflict).
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

    // Phase 2: bulk-move the remaining (non-colliding) loser rows onto
    // the winner list. Phase 1 already resolved collisions so
    // (winnerListId, wineId) is unique for survivors.
    await tx.listWine.updateMany({
      where: { listId: loserListId },
      data: { listId: winnerListId },
    })
  }

  // Repoint loser user's mainListId at the winner list. After this, both
  // users' User.mainListId point at the same row, so they share edits
  // via ListWine membership on that row. The User.mainListId column is
  // intentionally NON-unique (v0.15.0 comment in schema.prisma) — the
  // share-merge legitimately produces two users pointing at the same
  // List.
  await tx.user.update({
    where: { id: args.loserUserId },
    data: { mainListId: winnerListId },
  })

  // Drop the loser list row. If migrateLoserWines=false, the ListWines
  // go too via List cascade, which then cascades to drop the Wine rows
  // that have zero remaining ListWine refs. Deliberately destructive.
  await tx.list.delete({ where: { id: loserListId } })

  return { mergedInto: winnerListId }
}
