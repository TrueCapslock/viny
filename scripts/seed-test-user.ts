import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { hash } from "bcryptjs"

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const hashed = await hash("test123", 12)
  const user = await prisma.user.upsert({
    where: { email: "test@test.no" },
    update: {},
    create: {
      email: "test@test.no",
      name: "Test Bruker",
      password: hashed,
    },
  })
  console.log("Test user created:", user.id, user.email)

  await prisma.wine.create({
    data: {
      name: "Testvin",
      producer: "Testprodusent",
      vintage: 2020,
      type: "red",
      varietal: "Cabernet Sauvignon",
      country: "Frankrike",
      region: "Bordeaux",
      notes: "En testvin",
      userId: user.id,
    },
  })
  console.log("Test wine added")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
