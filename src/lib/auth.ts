import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        return { id: String(user.id), email: user.email, name: user.name, image: user.image, prefersBeer: user.prefersBeer }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, trigger, session: newSession }) {
      if (user) {
        token.id = user.id
        token.image = user.image
        token.prefersBeer = user.prefersBeer
      }
      if (trigger === "update" && newSession?.prefersBeer !== undefined) {
        token.prefersBeer = newSession.prefersBeer
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.image = token.image as string | null | undefined
        session.user.prefersBeer = token.prefersBeer as boolean | undefined
      }
      return session
    },
  },
})
