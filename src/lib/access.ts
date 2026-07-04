import { prisma } from "@/lib/prisma"

export type WineAccess = "none" | "read" | "edit"

// v0.15.0: edit gate.
//
// owner of the wine (Wine.userId; byline-first in the new model), OR
// caller's MainList already contains a ListWine row for the wine.
//
// The second clause covers the share-merge case: both users point at the
// same MainList row, so each user's list has a ListWine row that grants
// them edit. Friends who only "peek" do not have a row in their MainList,
// so they land in `none` here.
export async function canEditWine(
  wineId: number,
  userId: number,
): Promise<boolean> {
  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { userId: true },
  })
  if (!wine) return false
  if (wine.userId === userId) return true

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) return false
  const lw = await prisma.listWine.findUnique({
    where: { listId_wineId: { listId: me.mainListId, wineId } },
  })
  return lw !== null
}

// v0.15.0: read gate.
//
//   - "edit" if canEditWine (above).
//   - "read" if the wine is on any list owned by caller (their own
//     Custom List pin; the asymmetric-reference pattern).
//   - "read" if caller is a friend of wine.userId AND the wine is on
//     wine.userId's MainList (the friend-peek case).
//   - "none" otherwise.
export async function wineAccess(
  wineId: number,
  userId: number,
): Promise<WineAccess> {
  if (await canEditWine(wineId, userId)) return "edit"

  const reachable = await prisma.listWine.findFirst({
    where: {
      wineId,
      list: {
        OR: [
          { isMain: true, userId },
          { isMain: false, userId },
        ],
      },
    },
    select: { listId: true },
  })
  if (reachable) return "read"

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { userId: true },
  })
  if (!wine) return "none"

  const owner = await prisma.user.findUnique({
    where: { id: wine.userId },
    select: { mainListId: true },
  })
  if (!owner?.mainListId) return "none"
  const onOwnersMainList = await prisma.listWine.findUnique({
    where: { listId_wineId: { listId: owner.mainListId, wineId } },
  })
  if (!onOwnersMainList) return "none"

  const isFriend = await prisma.friend.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: wine.userId },
        { requesterId: wine.userId, addresseeId: userId },
      ],
    },
  })
  return isFriend ? "read" : "none"
}
