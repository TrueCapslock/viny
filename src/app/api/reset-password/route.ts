import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

const MIN_PASSWORD_LENGTH = 6

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as
      | { token?: string; password?: string }
      | null
    const token = body?.token?.trim()
    const password = body?.password

    if (!token || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      // We intentionally reuse the generic message for "missing token" and
      // "weak password" so an attacker can't probe token validity through
      // a differing response shape on a technically-valid token.
      return NextResponse.json(
        { error: "Ugyldig eller utløpt lenke" },
        { status: 400 },
      )
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")

    // Race-safe single-use enforcement: updateMany only succeeds for rows
    // that are unused AND unexpired. Two simultaneous "reset" tabs can
    // both POST with the same plaintext token, but only one will see
    // count === 1.
    const claim = await prisma.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })

    if (claim.count === 0) {
      return NextResponse.json(
        { error: "Ugyldig eller utløpt lenke" },
        { status: 400 },
      )
    }

    // Find the user that owned this token. Done after the claim so we never
    // even leak userId existence on an invalid token check.
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    })
    if (!row) {
      // Extremely unlikely (would require the row to be deleted between the
      // updateMany and this findUnique), but treat as generic failure.
      return NextResponse.json(
        { error: "Ugyldig eller utløpt lenke" },
        { status: 400 },
      )
    }

    const hashed = await hash(password, 12)
    await prisma.user.update({
      where: { id: row.userId },
      data: { password: hashed },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/reset-password]", err)
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Ugyldig eller utløpt lenke"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
