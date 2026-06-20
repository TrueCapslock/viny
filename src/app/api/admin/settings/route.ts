import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

async function ensureSettings() {
  let settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: 1 } })
  }
  return settings
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  const settings = await ensureSettings()
  return NextResponse.json(settings)
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  await ensureSettings()
  const body = await request.json()
  const settings = await prisma.siteSettings.update({
    where: { id: 1 },
    data: { beerModeDisabled: body.beerModeDisabled },
  })
  return NextResponse.json(settings)
}
