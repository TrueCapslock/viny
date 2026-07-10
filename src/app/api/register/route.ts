import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "E-post og passord er påkrevd" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: "E-post er allerede registrert" }, { status: 409 })
  }

  const hashed = await hash(password, 12)

  // v0.15.0: each new user gets a per-user MainList (a List row with
  // isMain=true) and an admin membership row on it. Single Prisma
  // transaction so the FK and the membership land together — no observable
  // intermediate state where the User has the FK but no List row, or vice
  // versa.
  // v0.15.0 (Pass A): create the User first (gets an id we can put
  // on the List's metadata-owner column), then create the List with
  // that userId, then back-fill User.mainListId to the new List row.
  // The whole flow sits inside `$transaction` so concurrent DB
  // readers (under Postgres' default READ COMMITTED isolation) never
  // observe an intermediate state where the User has the FK but no
  // List row exists — or vice versa. Pass B (List first with
  // userId=undefined) was rejected: writing null into List.userId on
  // some adapters trips P2011 and leaves a List row whose metadata
  // owner is unrecorded.
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashed,
        name: name || null,
      },
    })
    const mainList = await tx.list.create({
      data: { name: "UseMainList", userId: newUser.id, isMain: true },
    })
    return tx.user.update({
      where: { id: newUser.id },
      data: { mainListId: mainList.id },
    })
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
