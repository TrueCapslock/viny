import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { renderResetPassword } from "@/emails/reset-password"

// 24 hours, per spec.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
// Generic message returned to the client in every case so we never leak
// which email addresses are registered.
const GENERIC_SUCCESS = { success: true }

export async function POST(request: Request) {
  try {
    // request.json().catch so a missing/invalid body becomes a 400-with-message
    // instead of a 500 with an empty body (mirrors the v0.12.0.1 fix on /api/profile).
    const body = await request.json().catch(() => null) as { email?: string } | null
    const email = body?.email?.trim().toLowerCase()

    if (!email) {
      // Still return the generic success so a caller probing for valid emails
      // can't distinguish "missing email" from "email not registered".
      return NextResponse.json(GENERIC_SUCCESS)
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      await handleResetRequest(user.id, user.email, request)
    } else {
      console.info("[api/forgot-password] no user matched the request")
    }

    return NextResponse.json(GENERIC_SUCCESS)
  } catch (err) {
    console.error("[api/forgot-password]", err)
    // Same generic success in error paths so we never leak info.
    return NextResponse.json(GENERIC_SUCCESS)
  }
}

async function handleResetRequest(
  userId: number,
  userEmail: string,
  request: Request,
) {
  // Delete any prior, still-valid tokens for this user. This keeps the table
  // small and (more importantly) invalidates any earlier reset links, so the
  // most recent email is always the one that works.
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  })

  // 32 random bytes → 43-char url-safe base64 string. Generated from the OS
  // CSPRNG, not from any user-supplied input.
  const plaintextToken = randomBytes(32).toString("base64url")
  // We store the hash, never the plaintext. A DB leak therefore cannot be
  // used to reset arbitrary accounts; the matching plaintext only ever
  // lives in the email and the URL the user clicks.
  const tokenHash = createHash("sha256").update(plaintextToken).digest("hex")
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  })

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : new URL(request.url).origin)

  const resetUrl = `${origin}/reset-passord?token=${encodeURIComponent(plaintextToken)}`

  await sendResetEmail(userEmail, resetUrl)
}

async function sendResetEmail(to: string, resetUrl: string) {
  // The email template lives in src/emails/reset-password.ts so the
  // /dev/emails preview page (and its Playwright snapshot test) can
  // render the same string the API actually sends. Any change to
  // copy, color, or layout is made in ONE place.
  const { subject, text, html } = renderResetPassword({ resetUrl })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "Uva <noreply@uva.no>"

  if (!apiKey) {
    // No key configured – act as no-op so the generic 200 still flows back.
    // In dev we log the reset URL so the flow can be tested without an
    // email provider. In production we never log the URL – anyone with read
    // access to Vercel function logs would otherwise be able to reset any
    // user’s password.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[api/forgot-password] RESEND_API_KEY not set – password reset emails disabled",
      )
    } else {
      console.warn(
        `[api/forgot-password] RESEND_API_KEY missing – dev-mode reset link: ${resetUrl}`,
      )
    }
    return
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, text, html })
  if (error) {
    // Don't surface this to the client (would leak that the email exists).
    console.error("[api/forgot-password] Resend send error:", error)
  }
}
