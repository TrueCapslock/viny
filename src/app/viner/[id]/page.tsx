import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { TastingForm } from "./tasting-form"
import { TastingList } from "./tasting-list"
import { DeleteButton } from "@/app/_components/delete-button"
import { WineGlass, Stars } from "@/app/_components/icons"

type Params = Promise<{ id: string }>

export default async function WineDetailPage({ params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const { id } = await params
  const wine = await prisma.wine.findFirst({
    where: { id: parseInt(id), userId: parseInt(session.user.id) },
    include: { tastings: { orderBy: { date: "desc" } } },
  })

  if (!wine) notFound()

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-wine-200 hover:text-white transition-colors mb-3"
        >
          &larr; Tilbake
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{wine.name}</h1>
            <p className="text-base text-wine-200 mt-0.5">
              {wine.producer}
              {wine.vintage && `, ${wine.vintage}`}
            </p>
          </div>
          <WineGlass className="w-8 h-9 text-gold-300/50 shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {wine.type && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10">
              {typeLabel(wine.type)}
            </span>
          )}
          {wine.varietal && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10">
              {wine.varietal}
            </span>
          )}
          {wine.country && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10">
              {wine.country}
            </span>
          )}
          {wine.region && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10">
              {wine.region}
            </span>
          )}
        </div>

        {wine.notes && (
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 text-sm text-wine-100 leading-relaxed">
            {wine.notes}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Link
            href={`/viner/${wine.id}/rediger`}
            className="text-xs text-wine-200 hover:text-white transition-colors border border-wine-400/30 rounded-full px-3.5 py-1.5 hover:bg-white/10"
          >
            Rediger
          </Link>
          <DeleteButton wineId={wine.id} wineName={wine.name} tastingCount={wine.tastings.length} />
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24">
        <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <h2 className="text-base font-bold text-wine-800 mb-3">
            Smaksnotater ({wine.tastings.length})
          </h2>
          <TastingList tastings={wine.tastings} />
        </section>

        <section className="mt-4 bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-wine-800 mb-3">Legg til smaking</h3>
          <TastingForm wineId={wine.id} />
        </section>
      </div>
    </div>
  )
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    red: "Rødvin",
    white: "Hvitvin",
    sparkling: "Mousserende",
    rose: "Rosé",
    dessert: "Dessertvin",
  }
  return labels[type] ?? type
}
