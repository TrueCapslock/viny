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
  const user = await prisma.user.create({
    data: { email, password: hashed, name: name || null },
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
