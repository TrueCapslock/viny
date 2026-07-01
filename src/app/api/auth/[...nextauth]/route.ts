import { handlers } from "@/lib/auth"

// The Freebuff Cloud preview embeds the app in a cross-origin iframe. NextAuth
// v5 beta.31 hard-codes `SameSite=Lax` on the csrf-token / session-token /
// callback-url `Set-Cookie` headers regardless of the `cookies:` config in
// `src/lib/auth.ts` (verified via the browser: `__Host-authjs.csrf-token...;
// Path=/; HttpOnly; Secure; SameSite=Lax` even when our config sets
// `sameSite: "none"`). In a cross-origin iframe the browser refuses to attach
// Lax cookies to a cross-site POST, so the CSRF round-trip breaks and the
// server raises `MissingCSRF`.
//
// We don't override that at the NextAuth config layer (NextAuth reads our
// cookie config for `name`, `secure`, `path`, `httpOnly` but not for
// `sameSite` in beta.31). Instead, we wrap the route handler here: call the
// original handlers, then rewrite any `Set-Cookie` line that still has
// `SameSite=Lax` to `SameSite=None`, adding `Secure` if it isn't already
// there. We only do this in iframe mode (production release, Vercel-style
// preview, or `AUTH_TRUST_HOST=true`) so plain http://localhost still gets
// Lax cookies, which work on same-origin POSTs.
// Default the iframe-friendly cookie rewrite ON for this narrow route.
// NextAuth v5 beta.31 hard-codes SameSite=Lax on /api/auth/* cookies,
// which breaks the CSRF round-trip from inside a cross-origin
// iframe (the Freebuff Cloud preview). Lax only matters when POSTs
// are cross-site, so flipping this on never hurts same-origin hosts.
// Local dev on http://localhost can explicitly opt out with
// AUTH_TRUST_HOST=false; positive triggers (production, VERCEL=1,
// AUTH_TRUST_HOST=true) are also honoured.
const iframeCookieMode =
  process.env.AUTH_TRUST_HOST !== "false" &&
  (process.env.NODE_ENV !== "development" ||
    !!process.env.VERCEL ||
    process.env.AUTH_TRUST_HOST === "true")

function rewriteLaxToNone(headers: Headers): void {
  const getSetCookie = (
    headers as unknown as { getSetCookie?: () => string[] }
  ).getSetCookie
  const values =
    typeof getSetCookie === "function" ? getSetCookie.call(headers) : null
  if (!values || values.length === 0) return
  headers.delete("set-cookie")
  for (const raw of values) {
    let next = raw
    if (/SameSite=Lax/i.test(next)) {
      next = next.replace(/SameSite=Lax/i, "SameSite=None")
      if (!/(^|;)\s*Secure(=|;|$)/i.test(next)) {
        next = `${next}; Secure`
      }
    }
    headers.append("set-cookie", next)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (handler: any) =>
  async (
    request: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any,
  ): Promise<Response> => {
    const response = await handler(request, context)
    if (!iframeCookieMode) return response
    rewriteLaxToNone(response.headers)
    return response
  }

export const GET = wrap(handlers.GET)
export const POST = wrap(handlers.POST)
