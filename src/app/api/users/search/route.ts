import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  if (!q || q.length < 2) return NextResponse.json([])

  const userId = parseInt(session.user.id)

  // Hide ephemeral Playwright test users from real-user searches. The
  // e2e specs create users with names like `e2e-friend-<stamp>` and
  // `e2e-merge-<stamp>` (see e2e/mainlist-merge.spec.ts +
  // e2e/vinskapet.spec.ts) — without this filter they show up in
  // search results mid-run and pollute the friend-picker UI. The
  // seeded test user (test@test.no / "Test Bruker") is intentionally
  // NOT hidden: it's a baseline fixture that mirrors a real account
  // and may be used as a fixture in dev work; if hard isolation is
  // needed a future change can add an `isTest: Boolean` column.
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: userId } },
        {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        { NOT: { email: { startsWith: "e2e-", mode: "insensitive" } } },
      ],
    },
    select: { id: true, name: true, email: true, image: true },
    take: 10,
  })

  return NextResponse.json(users)
}
