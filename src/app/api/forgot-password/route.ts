import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

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
  const subject = "Tilbakestill passordet ditt på Viny"

  const text =
    `Hei!\n\n` +
    `Vi har mottatt en forespørsel om å tilbakestille passordet ditt på Viny.\n` +
    `Klikk på lenken under for å velge et nytt passord:\n\n` +
    `${resetUrl}\n\n` +
    `Lenken er gyldig i 24 timer. Hvis du ikke har bedt om dette, kan du\n` +
    `ignorere e-posten – passordet ditt blir ikke endret.\n\n` +
    `– Viny`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #7f1d1d 0%, #881337 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 600;">Viny</h1>
      </div>
      <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
          Hei! Vi har mottatt en forespørsel om å tilbakestille passordet ditt.
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5;">
          Klikk på knappen under for å velge et nytt passord:
        </p>
        <p style="margin: 0 0 24px; text-align: center;">
          <a href="${resetUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #b91c1c 0%, #881337 100%); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-size: 15px; font-weight: 500;">
            Tilbakestill passord
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #6b7280;">
          Lenken er gyldig i 24 timer. Hvis knappen ikke virker, kopier URL-en under
          inn i nettleseren din:
        </p>
        <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #6b7280;">
          ${resetUrl}
        </p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
          Hvis du ikke har bedt om dette, kan du ignorere e-posten – passordet ditt
          blir ikke endret.
        </p>
      </div>
    </div>
  `

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "Viny <noreply@viny.no>"

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
