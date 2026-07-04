import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Params = Promise<{ id: string }>

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) return null
  return parseInt(session.user.id)
}

// v0.14.0: read access. Rules:
//   1. Owner can always read.
//   2. Any SharedListMember of the wine's sharedListId can read.
//   3. The owner's friends can read the owner's Vinskapet wines (read-only):
//      that's exactly `wine.sharedListId === wine.user.defaultSharedListId`.
//   4. Custom-list wines (sharedListId IS NULL) are owner-only.
async function canAccessWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: { user: { select: { defaultSharedListId: true } } },
  })
  if (!wine) return null
  if (wine.userId === userId) return wine

  if (wine.sharedListId) {
    const isMember = await prisma.sharedListMember.findUnique({
      where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
    })
    if (isMember) return wine
  }

  // Friend + wine is in the owner's Vinskapet.
  if (
    wine.sharedListId &&
    wine.sharedListId === wine.user.defaultSharedListId
  ) {
    const isFriend = await prisma.friend.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId, addresseeId: wine.userId },
          { requesterId: wine.userId, addresseeId: userId },
        ],
      },
    })
    if (isFriend) return wine
  }

  return null
}

// v0.14.0: write access is owner OR any SharedListMember of the wine's
// sharedListId.
async function canEditWine(wineId: number, userId: number) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } })
  if (!wine) return null
  if (wine.userId === userId) return wine

  if (wine.sharedListId) {
    const isMember = await prisma.sharedListMember.findUnique({
      where: { sharedListId_userId: { sharedListId: wine.sharedListId, userId } },
    })
    if (isMember) return wine
  }

  return null
}

// v0.14.0: when toggling inCellar across the Vinskapet boundary, flip
// Wine.sharedListId too. Wines that are parked in an EXPLICIT (shared-lists)
// SharedList are not touched — inCellar is then orthogonal to that
// shared-list membership and the caller can move the wine back into their
// Vinskapet explicitly.
async function resolveCellarSharedListUpdate(
  existing: { userId: number; sharedListId: number | null },
  inCellar: boolean,
): Promise<{ sharedListId: number | null } | null> {
  const owner = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { defaultSharedListId: true },
  })
  const vinskapId = owner?.defaultSharedListId ?? null

  if (inCellar) {
    // Move into the Vinskapet only if currently unshared or already in the
    // Vinskapet.
    if (existing.sharedListId === null || existing.sharedListId === vinskapId) {
      return { sharedListId: vinskapId }
    }
    return null
  } else {
    // Pull out of the Vinskapet only if currently parked there.
    if (vinskapId !== null && existing.sharedListId === vinskapId) {
      return { sharedListId: null }
    }
    return null
  }
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wine = await canAccessWine(parseInt(id), userId)
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const full = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: {
      tastings: { orderBy: { date: "desc" } },
      sharedList: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(full)
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const inCellar = body.inCellar ?? false
  const sharedListUpdate = await resolveCellarSharedListUpdate(
    { userId: existing.userId, sharedListId: existing.sharedListId },
    inCellar,
  )

  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
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
      inCellar,
      quantity: inCellar ? parseInt(body.quantity) || 0 : 0,
      ...(sharedListUpdate ?? {}),
    },
  })
  return NextResponse.json(wine)
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const inCellar = body.inCellar ?? false
  const sharedListUpdate = await resolveCellarSharedListUpdate(
    { userId: existing.userId, sharedListId: existing.sharedListId },
    inCellar,
  )

  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
    data: {
      inCellar,
      quantity: inCellar ? parseInt(body.quantity) || 0 : 0,
      ...(sharedListUpdate ?? {}),
    },
  })
  return NextResponse.json(wine)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await canEditWine(parseInt(id), userId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.wine.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
