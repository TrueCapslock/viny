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

  // v0.14.0: each new user gets a per-user default SharedList ("Vinskapet")
  // too. We do this in a Prisma transaction so the FK and the admin
  // membership land together — no observable intermediate state where the
  // User has the FK but no membership row (or vice versa).
  const user = await prisma.$transaction(async (tx) => {
    const vinskap = await tx.sharedList.create({
      data: { name: "Vinskapet" },
    })
    return tx.user.create({
      data: {
        email,
        password: hashed,
        name: name || null,
        defaultSharedListId: vinskap.id,
        sharedListMembers: {
          create: [{ sharedListId: vinskap.id, role: "admin" }],
        },
      },
    })
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
