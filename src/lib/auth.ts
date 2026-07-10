import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"

// Auth.js v5 defaults cookie SameSite=Lax. The Freebuff Cloud preview embeds
// the app in a cross-origin iframe, and browsers refuse to attach Lax
// cookies to a cross-site POST — so the CSRF cookie set on
// GET /api/auth/csrf never reaches POST /api/auth/callback/credentials and
// the server raises MissingCSRF. SameSite=None; Secure fixes the iframe,
// but Secure is rejected on plain-http://localhost, so we only flip it on
// when one of these is true:
//
//   - production builds (`next build && next start`)
//   - the Cloud preview (`VERCEL=1`, which Vercel-style sandboxes set)
//   - explicit opt-in via `AUTH_TRUST_HOST=true` in the Cloud Keys tab
//
// On the local `http://localhost:3000` path None+Secure is dropped by the
// browser, so the heuristic excludes it; flip AUTH_TRUST_HOST=true if you
// need iframe-compatible dev too. We also match NextAuth's production
// cookie-name prefixes (__Secure- for session/callback, __Host- for csrf)
// so the names proxy.ts and server-side auth() look for line up.
const useSecureCookies =
  process.env.NODE_ENV === "production" ||
  !!process.env.VERCEL ||
  process.env.AUTH_TRUST_HOST === "true"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
const hostPrefix = useSecureCookies ? "__Host-" : ""

export const { handlers, signIn, signOut, auth } = NextAuth({
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? "none" : "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${hostPrefix}authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? "none" : "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: useSecureCookies ? "none" : "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Passord", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await compare(password, user.password)
        if (!valid) return null

        return { id: String(user.id), email: user.email, name: user.name, image: user.image, prefersBeer: user.prefersBeer, prefersDarkMode: user.prefersDarkMode, isAdmin: user.isAdmin, wineapiKey: user.wineapiKey, openRouterKey: user.openRouterKey, visionModel: user.visionModel }
      },
    }),
  ],
  session: { strategy: "jwt" },
  // Vercel-style preview sandboxes and the Freebuff Cloud preview iframe
  // proxy requests with a Host header that can differ from AUTH_URL /
  // NEXTAUTH_URL (and from the URL the user sees when opening the preview
  // in a new tab). NextAuth v5 defaults to trustHost: false, which causes
  // /api/auth/callback/credentials to silently reject the POST in the
  // iframe while succeeding in the new tab. Trusting the request Host is
  // safe here because this app only uses the Credentials + JWT provider
  // (no OAuth redirect-URI validation depends on AUTH_URL).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session: newSession }) {
      if (user) {
        token.id = user.id
        token.image = user.image
        token.prefersBeer = user.prefersBeer
        token.prefersDarkMode = user.prefersDarkMode
        token.isAdmin = user.isAdmin
      }
      if (trigger === "update") {
        if (newSession?.prefersBeer !== undefined) {
          token.prefersBeer = newSession.prefersBeer
        }
        if (newSession?.prefersDarkMode !== undefined) {
          token.prefersDarkMode = newSession.prefersDarkMode
        }
        const dbUser = await prisma.user.findUnique({ where: { id: parseInt(token.id as string) } })
        if (dbUser) {
          token.isAdmin = dbUser.isAdmin
          token.prefersBeer = dbUser.prefersBeer
          token.prefersDarkMode = dbUser.prefersDarkMode
          token.name = dbUser.name
          token.email = dbUser.email
          token.image = dbUser.image
          token.wineapiKey = dbUser.wineapiKey
          token.openRouterKey = dbUser.openRouterKey
          token.visionModel = dbUser.visionModel
        }
      }
      const settings = await prisma.siteSettings.findFirst()
      token.beerModeDisabled = settings?.beerModeDisabled ?? false
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.image = token.image as string | null | undefined
        session.user.prefersBeer = token.prefersBeer as boolean | undefined
        session.user.prefersDarkMode = token.prefersDarkMode as boolean | undefined
        session.user.isAdmin = token.isAdmin as boolean | undefined
        session.user.beerModeDisabled = token.beerModeDisabled as boolean | undefined
        session.user.wineapiKey = token.wineapiKey as string | null | undefined
        session.user.openRouterKey = token.openRouterKey as string | null | undefined
        session.user.visionModel = token.visionModel as string | null | undefined
      }
      return session
    },
  },
})
