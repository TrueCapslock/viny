import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
    }

    // .catch(...) so an empty or invalid body surfaces as a JSON 500 with a
    // logged error instead of an uncaught 500 (which Next.js renders as an
    // empty body and breaks the front-end's res.json()).
    const body = await request.json().catch((e) => {
      console.error("[api/profile PUT] invalid JSON body", e)
      return {}
    })
    const { name, email, image, prefersBeer, prefersDarkMode, wineapiKey, openRouterKey, visionModel } = body
    const userId = parseInt(session.user.id)

    if (email !== undefined && email !== session.user.email) {
      const exists = await prisma.user.findUnique({ where: { email } })
      if (exists) {
        return NextResponse.json({ error: "E-post er allerede i bruk" }, { status: 409 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name: name || null } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(image !== undefined ? { image: image || null } : {}),
        ...(prefersBeer !== undefined ? { prefersBeer } : {}),
        ...(prefersDarkMode !== undefined ? { prefersDarkMode } : {}),
        ...(wineapiKey !== undefined ? { wineapiKey } : {}),
        ...(openRouterKey !== undefined ? { openRouterKey } : {}),
        ...(visionModel !== undefined ? { visionModel } : {}),
      },
    })

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, image: updated.image, prefersBeer: updated.prefersBeer, prefersDarkMode: updated.prefersDarkMode, visionModel: updated.visionModel })
  } catch (err) {
    // Log the full error to Vercel so the next bug is debuggable from logs.
    console.error("[api/profile PUT]", err)
    // Surface the actual message in dev (no schema-leak risk on localhost);
    // generic message in production. The full error is in Vercel's runtime
    // logs either way.
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Intern serverfeil"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
