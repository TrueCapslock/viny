import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    console.log("[change-password] session:", JSON.stringify(session?.user))
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Nåværende og nytt passord er påkrevd" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Nytt passord må være minst 6 tegn" }, { status: 400 })
    }

    const userId = parseInt(session.user.id)
    console.log("[change-password] userId:", userId)
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      console.warn("[change-password] user not found for id", userId, "session id", session.user.id)
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 })
    }
    if (!user.password) {
      console.warn("[change-password] user has no password for id", userId)
      return NextResponse.json({ error: "Bruker har ikke passord satt" }, { status: 400 })
    }

    const valid = await compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: "Nåværende passord er feil" }, { status: 403 })
    }

    const hashed = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/change-password]", err)
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Intern serverfeil"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
