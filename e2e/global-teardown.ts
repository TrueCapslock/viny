import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { TEST_USER_EMAIL } from "../scripts/test-constants"

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

/**
 * Playwright global teardown — runs once after all tests finish.
 *
 * Removes every row the e2e suite creates, then re-seeds the test user
 * to a known clean state so repeated runs start fresh.
 *
 * Safe to run regardless of partial cleanup by individual tests.
 */
async function globalTeardown() {
  // 1. Delete all wines with the E2E prefix (regardless of owner).
  await prisma.wine.deleteMany({ where: { name: { startsWith: "E2E " } } })

  // 2. Delete ephemeral e2e-* users (cascades to their wines, lists,
  //    friendships, share-invites, listWine rows, suggestions, etc.).
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } })

  // 3. Delete all non-MainList lists (custom lists created by tests).
  //    Must be done before re-seed so seed:test doesn't find orphan
  //    lists from prior runs.
  await prisma.list.deleteMany({ where: { isMain: { not: true } } })

  // 4. Delete all share-invites.
  await prisma.shareInvite.deleteMany()

  // 5. Delete all friendships.
  await prisma.friend.deleteMany()

  // 6. Delete all wine suggestions.
  await prisma.wineSuggestion.deleteMany()

  // 7. Delete all tastings (in case any were created by tests).
  await prisma.tasting.deleteMany()

  // 8. Delete the seeded test user's non-Testvin wines.
  const testUser = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
    select: { id: true },
  })
  if (testUser) {
    await prisma.wine.deleteMany({
      where: {
        userId: testUser.id,
        name: { not: "Testvin" },
      },
    })
  }

  await prisma.$disconnect()

  // 9. Re-seed the test user + Testvin to a clean state.
  const { execSync } = await import("node:child_process")
  execSync("npm run seed:test", { stdio: "inherit", env: { ...process.env, FORCE_COLOR: "0" } })
}

globalTeardown().catch((e) => {
  console.error("Global teardown failed:", e)
  process.exit(1)
})
