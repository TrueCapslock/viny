import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { TastingForm } from "./tasting-form"
import { TastingList } from "./tasting-list"
import { DeleteButton } from "@/app/_components/delete-button"
import { WineGlass } from "@/app/_components/icons"

type Params = Promise<{ id: string }>

export default async function WineDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const wine = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { tastings: { orderBy: { date: "desc" } } },
  })

  if (!wine) notFound()

  return (
    <div className="flex-1 bg-wine-gradient-light">
      <div className="bg-wine-gradient text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 pb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-wine-200 hover:text-white transition-colors"
          >
            &larr; Alle viner
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{wine.name}</h1>
              <p className="text-lg text-wine-200 mt-1">
                {wine.producer}
                {wine.vintage && `, ${wine.vintage}`}
              </p>
            </div>
            <WineGlass className="w-10 h-12 text-gold-300/50 shrink-0" />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-wine-200">
            {wine.type && <span>{typeLabel(wine.type)}</span>}
            {wine.varietal && <span>{wine.varietal}</span>}
            {wine.region && <span>{wine.region}</span>}
            {wine.country && <span>{wine.country}</span>}
          </div>

          {wine.notes && (
            <p className="mt-4 text-sm text-wine-100 bg-white/10 rounded-xl px-4 py-3">
              {wine.notes}
            </p>
          )}

          <div className="flex gap-4 mt-6">
            <Link
              href={`/viner/${wine.id}/rediger`}
              className="text-sm text-wine-200 hover:text-white transition-colors border border-wine-400/30 rounded-full px-4 py-1.5 hover:bg-white/10"
            >
              Rediger
            </Link>
            <DeleteButton wineId={wine.id} wineName={wine.name} tastingCount={wine.tastings.length} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">
        <section className="bg-white rounded-2xl shadow-sm border border-cream-200 p-6">
          <h2 className="text-xl font-bold text-wine-800 mb-4">
            Smaksnotater ({wine.tastings.length})
          </h2>
          <TastingList tastings={wine.tastings} />
        </section>

        <section className="mt-6 bg-white rounded-2xl shadow-sm border border-cream-200 p-6">
          <h3 className="text-lg font-bold text-wine-800 mb-4">Legg til smaking</h3>
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
