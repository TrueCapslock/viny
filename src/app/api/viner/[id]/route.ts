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
      // v0.18.0: allow editing the EAN chip directly from the edit form.
      //
      // We only spread the `ean` key when the body actually carries one,
      // so a request that omits the field leaves the column as-is.
      // When the body has an `ean` string, normalise to digits-only --
      // an empty / non-numeric / wrong-length value clears the column
      // (null), which matches the WineForm's "Fjern" behaviour. Prisma
      // rejects bare `undefined` for a nullable field; setting the key
      // conditionally with a spread keeps it out of the update entirely.
      ...(typeof body.ean === "string"
        ? {
            ean:
              body.ean.replace(/\D/g, "").length >= 7 &&
              body.ean.replace(/\D/g, "").length <= 14
                ? body.ean.replace(/\D/g, "")
                : null,
          }
        : {}),
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
    // `list: { userId }` covers Custom Lists the caller owns.
    // After a share-merge the caller's MainList may have a different
    // `userId` (the friend's), so we explicitly include `mainListId`
    // to catch that case.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { mainListId: true },
    })

    await prisma.$transaction([
      prisma.listWine.deleteMany({
        where: {
          wineId,
          OR: [
            { list: { userId } },
            ...(me?.mainListId ? [{ listId: me.mainListId }] : []),
          ],
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
  // Capture the narrowed numeric mainListId into a local before the
  // $transaction callback — TS doesn't preserve the `!me?.mainListId`
  // narrowing across the async closure boundary, so `me.mainListId`
  // reads back as `number | null` inside the callback and fails the
  // composite-key typecheck on tx.listWine.delete.
  const mainListId = me.mainListId
  // Interactive-form $transaction so we can swallow the listWine.delete
  // P2025 (benign) without leaving the wine-deleteMany split between two
  // non-atomic writes. The array form `$transaction([...])` rejects a
  // chained `.catch()` because the catch breaks the PrismaPromise
  // typing — only interactive callbacks let us `try/catch` mid-tx.
  await prisma.$transaction(async (tx) => {
    try {
      await tx.listWine.delete({
        where: { listId_wineId: { listId: mainListId, wineId } },
      })
    } catch (e) {
      // P2025 (record not found) is benign — the wine simply wasn't
      // on this user's MainList. Anything else is a real error and
      // should roll the transaction back.
      if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
        // fall through
      } else {
        throw e
      }
    }
    await tx.wine.deleteMany({
      where: {
        id: wineId,
        inLists: { none: {} },
      },
    })
  })

  return NextResponse.json({ success: true })
}
