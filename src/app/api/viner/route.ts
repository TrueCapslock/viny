import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId")

  let ownerId = userId
  let isOwnView = true

  if (targetUserId) {
    const targetId = parseInt(targetUserId)
    if (targetId !== userId) {
      // Friend gate: must be an accepted Friend of target.
      const isFriend = await prisma.friend.findFirst({
        where: {
          status: "accepted",
          OR: [
            { requesterId: userId, addresseeId: targetId },
            { requesterId: targetId, addresseeId: userId },
          ],
        },
      })
      if (!isFriend) return NextResponse.json({ error: "Not found" }, { status: 404 })
      isOwnView = false
    }
    ownerId = targetId
  }

  // v0.15.0: visibility is via List membership.
  //
  //   Own view:
  //     - Wines on the caller's MainList (filtered by isMain=true).
  //     - Wines on caller's Custom Lists (isMain=false, viewer=userId).
  //
  //   Friend peek of X (?userId=X):
  //     - Wines on X's MainList only (X remains owner; friend reads-only
  //       but inCellar + quantity are surfaced per the resolved spec).

  // Discover the relevant lists for the query.
  let mainListId: number | null = null
  if (isOwnView) {
    const me = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { mainListId: true },
    })
    mainListId = me?.mainListId ?? null
  } else {
    const target = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { mainListId: true },
    })
    mainListId = target?.mainListId ?? null
  }

  const customListIds = isOwnView
    ? (
        await prisma.list.findMany({
          where: { userId: ownerId, isMain: false },
          select: { id: true },
        })
      ).map((l) => l.id)
    : []

  const listIdsToShow: number[] = []
  if (mainListId !== null) listIdsToShow.push(mainListId)
  listIdsToShow.push(...customListIds)

  if (listIdsToShow.length === 0) {
    return NextResponse.json([])
  }

  const listWines = await prisma.listWine.findMany({
    where: { listId: { in: listIdsToShow } },
    include: {
      wine: {
        include: {
          _count: { select: { tastings: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  })

  // Compute average rating per wine (cheap; ≤ a handful per page).
  // Note: we dedupe by wineId below, so this array must feed the
  // dedupe-aware output builder — we hash by lw.wineId, not lw.id.
  const wineIds = listWines.map((lw) => lw.wineId)
  const ratings = wineIds.length
    ? await prisma.tasting.groupBy({
        by: ["wineId"],
        where: { wineId: { in: wineIds } },
        _avg: { rating: true },
      })
    : []
  const ratingByWine = new Map<number, number>()
  for (const r of ratings) {
    ratingByWine.set(r.wineId, Math.round(r._avg.rating ?? 0))
  }

  // Group listWines by wineId. A wine on both MainList and a Custom
  // List produces two (listId, wineId) rows with the same Wine.id —
  // without dedup the home page (`<WineCard key={wine.id}>`) renders
  // the same wine twice in "Alle viner" / cellar views, which the
  // user reads as "duplicate".
  //
  // Pick the row whose owning list IS the user's MainList when both
  // exist (the home view's authoritative source: a wine the owner
  // has marked as in-cellar must surface as in-cellar, even if it's
  // also pinned on a Custom List). For wines on Custom Lists only,
  // pick the most-recently-added row (the existing orderBy: { addedAt:
  // "desc" } pre-sorts so the first row we see is the freshest, and
  // the `uniqueByWineId.has()` check skips older duplicates).
  //
  // Friend-peek (targetUserId set) usually shows a single MainList,
  // so the input set already has at most one row per wineId — this
  // dedup is a no-op for that path, just a defensive belt-and-braces
  // that costs ~O(n) work.
  const uniqueByWineId = new Map<number, (typeof listWines)[number]>()
  for (const lw of listWines) {
    if (lw.listId === mainListId) {
      // MainList row always wins over any Custom List pin.
      uniqueByWineId.set(lw.wineId, lw)
      continue
    }
    if (!uniqueByWineId.has(lw.wineId)) {
      uniqueByWineId.set(lw.wineId, lw)
    }
  }

  // Stable order: most-recently-added ListWine first.
  const out = Array.from(uniqueByWineId.values()).map((lw) => ({
    ...lw.wine,
    listId: lw.listId,
    inCellar: lw.inCellar,
    quantity: lw.quantity,
    avgRating: ratingByWine.get(lw.wineId) ?? 0,
  }))

  return NextResponse.json(out)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId")

  let ownerId = userId

  if (targetUserId) {
    const targetId = parseInt(targetUserId)
    if (targetId !== userId) {
      // v0.15.0: caller must share the target's MainList to add a wine
      // on their behalf. "Share" means both User.mainListId point at the
      // same List row.
      const [me, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { mainListId: true } }),
        prisma.user.findUnique({ where: { id: targetId }, select: { mainListId: true } }),
      ])
      if (!me?.mainListId || !target?.mainListId) {
        return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 })
      }
      if (me.mainListId !== target.mainListId) {
        return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 })
      }
    }
    ownerId = targetId
  }

  const body = await request.json()
  const me = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) {
    return NextResponse.json({ error: "Hovedliste ikke klar" }, { status: 409 })
  }

  const inCellar = !!body.inCellar
  const quantity = inCellar ? parseInt(body.quantity) || 0 : 0

  const wine = await prisma.wine.create({
    data: {
      name: body.name,
      producer: body.producer,
      vintage: body.vintage ? parseInt(body.vintage) : null,
      varietal: body.varietal || null,
      region: body.region || null,
      country: body.country || null,
      type: body.type || null,
      notes: body.notes || null,
      image: body.image || null,
      userId: ownerId,
      inLists: {
        create: [{ listId: me.mainListId, inCellar, quantity }],
      },
    },
    include: { inLists: true },
  })

  return NextResponse.json(wine, { status: 201 })
}
