import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  // Public endpoints (no auth required) are excluded from the auth gate:
  // - glemt-passord / reset-passord: password-recovery flow users can't be signed in for
  // - api/forgot-password / api/reset-password: their backing POST endpoints
  // - dev/emails: dev-only email-template preview; the page itself is
  //   NODE_ENV-gated and notFound()s in production unless
  //   ENABLE_EMAIL_PREVIEW=1 is set, so it can never leak real emails
  //   outside dev / opted-in Vercel preview branches
  // The login / register / api/auth / api/register siblings were already public.
  matcher: [
    "/((?!login|register|glemt-passord|reset-passord|api/auth|api/register|api/forgot-password|api/reset-password|dev/emails|_next/static|_next/image|favicon.ico).*)",
  ],
}
