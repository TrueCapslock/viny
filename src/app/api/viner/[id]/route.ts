import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canEditWine, wineAccess } from "@/lib/access"

type Params = Promise<{ id: string }>

async function getUserId(): Promise<number | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return parseInt(session.user.id)
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wineId = parseInt(id)
  const access = await wineAccess(wineId, userId)
  if (access === "none") return NextResponse.json({ error: "Not found" }, { status: 404 })

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: {
      tastings: { orderBy: { date: "desc" } },
    },
  })

  // Surface caller-perspective inCellar+quantity if caller can edit;
  // owner-perspective for friend-peek (per PLAN_LIST_REDESIGN §10.2).
  let inCellar = false
  let quantity = 0
  if (access === "edit") {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { mainListId: true },
    })
    if (me?.mainListId) {
      const myJoin = await prisma.listWine.findUnique({
        where: { listId_wineId: { listId: me.mainListId, wineId } },
      })
      inCellar = myJoin?.inCellar ?? false
      quantity = myJoin?.quantity ?? 0
    }
  } else if (access === "read" && wine) {
    const owner = await prisma.user.findUnique({
      where: { id: wine.userId },
      select: { mainListId: true },
    })
    if (owner?.mainListId) {
      const ownerJoin = await prisma.listWine.findUnique({
        where: { listId_wineId: { listId: owner.mainListId, wineId } },
      })
      inCellar = ownerJoin?.inCellar ?? false
      quantity = ownerJoin?.quantity ?? 0
    }
  }

  return NextResponse.json({ ...wine, inCellar, quantity })
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wineId = parseInt(id)
  if (!(await canEditWine(wineId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const inCellar = !!body.inCellar
  const quantity = inCellar ? parseInt(body.quantity) || 0 : 0

  const updated = await prisma.wine.update({
    where: { id: wineId },
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
    },
  })

  // Sync the caller's ListWine row on the (caller's MainList, wine). Auto-
  // creates the row if the caller is a sharer who just cellared the wine.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (me?.mainListId) {
    await prisma.listWine.upsert({
      where: { listId_wineId: { listId: me.mainListId, wineId } },
      create: { listId: me.mainListId, wineId, inCellar, quantity },
      update: { inCellar, quantity },
    })
  }

  return NextResponse.json({ ...updated, inCellar, quantity })
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wineId = parseInt(id)
  if (!(await canEditWine(wineId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const inCellar = !!body.inCellar
  const quantity = inCellar ? parseInt(body.quantity) || 0 : 0

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) {
    return NextResponse.json({ error: "Hovedliste ikke klar" }, { status: 409 })
  }

  await prisma.listWine.upsert({
    where: { listId_wineId: { listId: me.mainListId, wineId } },
    create: { listId: me.mainListId, wineId, inCellar, quantity },
    update: { inCellar, quantity },
  })

  return NextResponse.json({ success: true, inCellar, quantity })
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wineId = parseInt(id)
  if (!(await canEditWine(wineId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { userId: true },
  })
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = wine.userId === userId

  if (isOwner) {
    // Owner: drop the wine from the caller's OWN lists (MainList +
    // any Custom Lists where the caller is the list owner), then
    // conditionally delete the Wine row if no other ListWine still
    // references it.
    //
    // Two failure modes this branch has to avoid:
    //
    //   (a) The pre-fix handler only dropped the (caller's MainList,
    //       wine) ListWine row, then checked `inLists: { none: {} }`
    //       to decide whether to deleteMany the Wine. If the wine was
    //       on one of the caller's Custom Lists, the ListWine delete
    //       was a no-op, `inLists: { none: {} }` was false, and the
    //       Wine survived — but the handler returned `{ success: true }`
    //       while the wine was still on the Custom List. The user
    //       navigated to /, saw the wine still there, and the delete
    //       "didn't work".
    //
    //   (b) A naive "drop every ListWine for this wine" would also
    //       drop the friend's ListWine on their share-merged
    //       MainList, or a friend's pin of the same wine on their
    //       Custom List. The Wine would then be deleted, and the
    //       friend would lose their copy. The e2e suite's
    //       "split via API DELETE" test pins this invariant: the
    //       caller's delete must NOT affect the friend's copy.
    //
    // The fix: scope the ListWine drop to lists the caller owns
    // (`list: { userId }`). The Wine's fate then depends on whether
    // any non-caller-owned ListWine still references it — the same
    // TOCTOU-safe `inLists: { none: {} }` predicate the old handler
    // used, but now applied after the correct drop scope.
    //
    // Wrapped in a $transaction so a partial failure can't leave the
    // wine with zero ListWines but the row still present.
    await prisma.$transaction([
      prisma.listWine.deleteMany({
        where: {
          wineId,
          list: { userId },
        },
      }),
      prisma.wine.deleteMany({
        where: {
          id: wineId,
          inLists: { none: {} },
        },
      }),
    ])
    return NextResponse.json({ success: true })
  }

  // Co-editor (share-merge case): drop the wine from the caller's
  // MainList only. The wine itself usually stays — the owner still
  // references it (their `Wine.userId` byline, and the owner's
  // MainList still has the ListWine). But if the caller was the last
  // ref (e.g. the wine was on the shared list and no Custom List),
  // `inLists: { none: {} }` is now true and we delete the orphan Wine
  // row so it doesn't linger with zero ListWines. The TOCTOU-safe
  // `inLists: { none: {} }` predicate lets Postgres evaluate
  // atomically — a concurrent POST can't slip a row in between the
  // count and the delete.
  //
  // Both ops in a $transaction so a partial failure (e.g. a later
  // FK constraint surfaces) can't leave the wine with zero
  // ListWines but the row still present. Mirrors the owner branch.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) {
    return NextResponse.json({ error: "Hovedliste ikke klar" }, { status: 409 })
  }
  await prisma.$transaction([
    prisma.listWine
      .delete({
        where: { listId_wineId: { listId: me.mainListId, wineId } },
      })
      .catch((e) => {
        // P2025 (record not found) is benign — the wine simply wasn't
        // on this user's MainList. Anything else is a real error and
        // should roll the transaction back.
        if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
          return null
        }
        throw e
      }),
    prisma.wine.deleteMany({
      where: {
        id: wineId,
        inLists: { none: {} },
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
