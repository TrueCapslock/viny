import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
  }

  const { name, email, image, prefersBeer, wineapiKey, openRouterKey, visionModel } = await request.json()
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
      ...(wineapiKey !== undefined ? { wineapiKey } : {}),
      ...(openRouterKey !== undefined ? { openRouterKey } : {}),
      ...(visionModel !== undefined ? { visionModel } : {}),
    },
  })

  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, image: updated.image, prefersBeer: updated.prefersBeer, visionModel: updated.visionModel })
}
