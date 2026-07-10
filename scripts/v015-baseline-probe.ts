import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  // Counts that have well-defined semantics.
  const state = {
    users: await prisma.user.count(),
    usersWithMainList: await prisma.user.count({
      where: { mainListId: { not: null } },
    }),
    distinctMainLists: await prisma.user.findMany({
      where: { mainListId: { not: null } },
      select: { mainListId: true },
      distinct: ["mainListId"],
    }).then((rows) => rows.length),
    wines: await prisma.wine.count(),
    mainLists: await prisma.list.count({ where: { isMain: true } }),
    customLists: await prisma.list.count({ where: { isMain: false } }),
    listWines: await prisma.listWine.count(),
    listWinesOnMainLists: await prisma.listWine.count({
      where: { list: { isMain: true } },
    }),
    listWinesInCellar: await prisma.listWine.count({
      where: { inCellar: true },
    }),
    listWinesWithQuantity: await prisma.listWine.count({
      where: { quantity: { gt: 0 } },
    }),
    tastings: await prisma.tasting.count(),
    friendships: await prisma.friend.count({
      where: { status: "accepted" },
    }),
  }

  // Per-wine coverage: every Wine has at least one ListWine row.
  const winesWithNoList = await prisma.wine.findMany({
    where: { inLists: { none: {} } },
    select: { id: true, name: true, userId: true },
  })

  // Per-wine ownership: pull every wine's owner's mainListId and
  // explicitly check each wine's ListWine rows include at least one row
  // on the owner's main list (or a list whose mainListId matches the
  // owner's mainListId — the shared-merge case).
  const allWines = await prisma.wine.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      inLists: {
        select: {
          listId: true,
          list: { select: { id: true, isMain: true, userId: true } },
        },
      },
    },
  })

  const misplaced: Array<{ wineId: number; wineName: string; ownerId: number }> = []
  for (const wine of allWines) {
    // The owner's reachable MainList is the owner's mainListId.
    const ownerMainListId = await prisma.user
      .findUnique({
        where: { id: wine.userId },
        select: { mainListId: true },
      })
      .then((u) => u?.mainListId ?? null)

    // A wine is correctly placed iff at least one ListWine has listId ==
    // owner's mainListId. (Both users and shared-pair members have their
    // mainListId repointed at the same list, so this covers pairs.)
    const onOwnersMainList = wine.inLists.some(
      (lw) => lw.listId === ownerMainListId,
    )
    if (!onOwnersMainList) {
      misplaced.push({
        wineId: wine.id,
        wineName: wine.name,
        ownerId: wine.userId,
      })
    }
  }

  // Sample user pointing at a MainList (uses List.findUnique directly because
  // the schema does not declare User.mainList as a relation).
  const sampleUser = await prisma.user.findFirst({
    where: { mainListId: { not: null } },
    select: { id: true, email: true, name: true, mainListId: true },
  })
  const sampleMainListForUser = sampleUser?.mainListId
    ? await prisma.list.findUnique({
        where: { id: sampleUser.mainListId },
        select: {
          id: true,
          name: true,
          isMain: true,
          _count: { select: { wines: true } },
        },
      })
    : null

  // Sample shared-MainList pair to verify the v0.14.x share-pair rebind.
  const sharedPair = await prisma.user.findMany({
    where: { mainListId: { not: null } },
    select: { id: true, email: true, mainListId: true },
    orderBy: { id: "asc" },
  })
  const groupedByMainList = new Map<number, { id: number; email: string }[]>()
  for (const u of sharedPair) {
    if (!u.mainListId) continue
    const bucket = groupedByMainList.get(u.mainListId) ?? []
    bucket.push({ id: u.id, email: u.email })
    groupedByMainList.set(u.mainListId, bucket)
  }
  const sharedPairs = [...groupedByMainList.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([mainListId, members]) => ({ mainListId, members }))

  console.log("STATE:", JSON.stringify(state, null, 2))
  console.log(
    "WINES_WITH_NO_LIST (must be 0):",
    JSON.stringify(winesWithNoList, null, 2),
  )
  console.log(
    "WINES_PLACED_ON_FOREIGN_MAINLIST (must be 0):",
    JSON.stringify(misplaced, null, 2),
  )
  console.log(
    "SAMPLE_USER_WITH_MAINLIST:",
    JSON.stringify({ user: sampleUser, mainList: sampleMainListForUser }, null, 2),
  )
  console.log("SHARED_PAIRS:", JSON.stringify(sharedPairs, null, 2))

  const invariantOk =
    winesWithNoList.length === 0 &&
    state.usersWithMainList === state.users &&
    misplaced.length === 0
  console.log("INVARIANT_OK:", invariantOk)
}

main()
  .finally(() => prisma.$disconnect())
