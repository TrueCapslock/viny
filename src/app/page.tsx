import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { WineGlass, Grape, WineBottle } from "@/app/_components/icons"

export default async function HomePage() {
  const wines = await prisma.wine.findMany({
    include: { _count: { select: { tastings: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col flex-1 bg-wine-gradient-light">
      <div className="bg-wine-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-10 pb-14">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dine viner</h1>
              <p className="text-wine-200 mt-1 text-sm">
                {wines.length} {wines.length === 1 ? "vin" : "viner"} registrert
              </p>
            </div>
            <WineGlass className="w-12 h-14 text-gold-300/60" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 -mt-6 pb-12">
        {wines.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-cream-200">
            <Grape className="w-16 h-20 mx-auto text-wine-300" />
            <p className="text-wine-700 mt-4 font-medium">Ingen viner registrert ennå</p>
            <p className="text-wine-400 text-sm mt-1">Legg til din første vin og begynn å notere</p>
            <Link
              href="/viner/ny"
              className="inline-block mt-6 rounded-full bg-wine-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-wine-700 transition-colors"
            >
              + Legg til vin
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {wines.map((wine, i) => (
              <Link
                key={wine.id}
                href={`/viner/${wine.id}`}
                className="block rounded-2xl bg-white p-5 border border-cream-200 hover:border-wine-300 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-wine-900 truncate">{wine.name}</h2>
                    <p className="text-sm text-wine-600 mt-0.5 truncate">
                      {wine.producer}
                      {wine.vintage && `, ${wine.vintage}`}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-wine-400">
                      {wine.varietal && <span>{wine.varietal}</span>}
                      {wine.country && <span>{wine.country}</span>}
                    </div>
                  </div>
                  {i % 3 === 0 ? (
                    <WineBottle className="w-5 h-12 text-wine-300 shrink-0" />
                  ) : i % 3 === 1 ? (
                    <Grape className="w-6 h-8 text-wine-400 shrink-0" />
                  ) : (
                    <WineGlass className="w-5 h-6 text-wine-300 shrink-0" />
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between">
                  <span className="text-xs text-wine-400">
                    {wine._count.tastings} smaksnotat{wine._count.tastings !== 1 ? "er" : ""}
                  </span>
                  <span className="text-gold-600 text-xs">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {wines.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/viner/ny"
              className="inline-flex items-center gap-2 rounded-full bg-wine-600 px-6 py-3 text-sm font-medium text-white hover:bg-wine-700 transition-colors shadow-sm"
            >
              <span className="text-lg leading-none">+</span> Ny vin
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
