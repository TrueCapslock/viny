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

  const existingWine = await prisma.wine.findFirst({
    where: {
      userId: user.id,
      name: TEST_WINE_NAME,
      producer: TEST_WINE_PRODUCER,
    },
    select: { id: true },
  })

  if (!existingWine) {
    await prisma.wine.create({
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
    })
  }

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
