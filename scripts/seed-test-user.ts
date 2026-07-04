import "dotenv/config"
import { pathToFileURL } from "node:url"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { hash } from "bcryptjs"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_WINE_NAME,
  TEST_WINE_PRODUCER,
} from "./test-constants"

// Re-export so any existing imports of these from this file keep working.
export { TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_WINE_NAME, TEST_WINE_PRODUCER }

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

/**
 * Idempotently create the seeded test user + a single Testvin wine.
 * Safe to call repeatedly: existing rows are reused, never duplicated.
 */
export async function seedTestUser() {
  const hashed = await hash(TEST_USER_PASSWORD, 12)
  const user = await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: {
      email: TEST_USER_EMAIL,
      name: "Test Bruker",
      password: hashed,
    },
  })

  // v0.15.0: every user must have a MainList (List row with isMain=true)
  // and User.mainListId pointing at it. /api/viner only surfaces wines
  // that are on at least one list the caller can reach, so the seeded
  // Testvin is unreachable to e2e tests until it's joined to a list.
  // Idempotent across re-runs: a pre-v0.15.0 user that lacks a MainList
  // gets one; an existing MainList is reused.
  let mainList = await prisma.list.findFirst({
    where: { userId: user.id, isMain: true },
    select: { id: true },
  })
  if (!mainList) {
    mainList = await prisma.list.create({
      data: { name: "UseMainList", userId: user.id, isMain: true },
      select: { id: true },
    })
  }
  if (user.mainListId !== mainList.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mainListId: mainList.id },
    })
  }

  // v0.15.0: Testvin lives on the seeded user's MainList with inCellar=false,
  // quantity=0 — the v0.14.0 baseline. /api/viner surfaces MainList wines
  // to both the owner (own view) and any accepted friend (friend peek of
  // ?userId=<owner>); the friend-exclusion contract for Custom Lists is
  // exercised in e2e/vinskapet.spec.ts via a per-test ephemeral Custom
  // List (NOT via Testvin placement), so Testvin's MainList home keeps
  // the Find-or-Create paths stable and reachable for every other spec.
  const existingWine = await prisma.wine.findFirst({
    where: {
      userId: user.id,
      name: TEST_WINE_NAME,
      producer: TEST_WINE_PRODUCER,
    },
    select: { id: true },
  })

  let testWineId: number
  if (!existingWine) {
    const created = await prisma.wine.create({
      data: {
        name: TEST_WINE_NAME,
        producer: TEST_WINE_PRODUCER,
        vintage: 2020,
        type: "red",
        varietal: "Cabernet Sauvignon",
        country: "Frankrike",
        region: "Bordeaux",
        notes: "En testvin",
        userId: user.id,
      },
      select: { id: true },
    })
    testWineId = created.id
  } else {
    testWineId = existingWine.id
  }

  // Idempotent: ensure Testvin is on the MainList, and that no leftover
  // ListWine row from a prior seed variant clings to it. The delete
  // targets `listId != mainList.id` (NOT `list.isMain = false`) so we
  // also clean up orphan rows on other MainList rows that older seed
  // versions may have created for this user — without that, the
  // friend-view of /api/viner (which queries a single
  // `target.mainListId`) would miss Testvin whenever `user.mainListId`
  // pointed at a different MainList than the one `findFirst` returned.
  // That bit the e2e/vinskapet suite on its first real run: the test
  // user had 6 orphan MainList rows from a v0.14.0-era seed, and
  // Testvin was on one of them but not on the live `mainListId`.
  await prisma.listWine.upsert({
    where: {
      listId_wineId: { listId: mainList.id, wineId: testWineId },
    },
    create: {
      listId: mainList.id,
      wineId: testWineId,
      inCellar: false,
      quantity: 0,
    },
    update: {},
  })
  await prisma.listWine.deleteMany({
    where: {
      wineId: testWineId,
      listId: { not: mainList.id },
    },
  })

  // One-off mop: drop the orphan MainList rows themselves. Prior
  // seeds + mainlist-merge splits left them behind and the dev DB
  // has been growing them on every re-run.
  //
  // Safe to delete because:
  //   1. The user.update above has already repointed the test user's
  //      mainListId at the live list, and the deleteMany is scoped
  //      to lists owned by the test user — so no User row points at
  //      the orphans. Deleting a List does NOT cascade-clear
  //      User.mainListId (it's a plain Int column, not a FK).
  //   2. Their ListWine rows are cascade-deleted with the List
  //      (ListWine.list has onDelete: Cascade per schema.prisma);
  //      the deleteMany above already removed any Testvin rows on
  //      these lists, so nothing of value is lost.
  // Idempotent: no-op once the orphans are gone.
  await prisma.list.deleteMany({
    where: {
      userId: user.id,
      isMain: true,
      id: { not: mainList.id },
    },
  })

  return { userId: user.id }
}

async function main() {
  const { userId } = await seedTestUser()
  console.log(`Test user ready (id=${userId})`)
  await prisma.$disconnect()
}

// Run as a CLI only when invoked directly, not when imported by the test setup.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
