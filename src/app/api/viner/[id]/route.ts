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

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { mainListId: true },
  })
  if (!me?.mainListId) {
    return NextResponse.json({ error: "Hovedliste ikke klar" }, { status: 409 })
  }

  // Drop only the (caller's MainList, wine) ListWine row. Thinker risk
  // fix: if B pinned this wine on a private Custom List, B's reference
  // must survive A's removal-from-MainList. We only delete the Wine row
  // when zero ListWine rows reference it across all lists — evaluated
  // atomically by Postgres via the `inLists: { none: {} }` predicate
  // (the Wine→ListWine inverse relation declared in prisma/schema.prisma)
  // so a concurrent POST/merge can't slip a row in between a count and
  // a delete (TOCTOU).
  await prisma.listWine
    .delete({
      where: { listId_wineId: { listId: me.mainListId, wineId } },
    })
    .catch(() => null)

  await prisma.wine.deleteMany({
    where: {
      id: wineId,
      // The Wine→ListWine inverse relation in prisma/schema.prisma is
      // named `inLists` (matches the Prisma auto-naming convention for
      // a relation declared as `ListWine.wine` without `@relation(name)`).
      inLists: { none: {} },
    },
  })

  return NextResponse.json({ success: true })
}
