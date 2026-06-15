import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { WineGlass, Grape, WineBottle } from "@/app/_components/icons"
import { StaticStars } from "@/app/_components/star-rating"
import { SearchAndFilter } from "./search-filter"

export default async function HomePage(props: { searchParams?: Promise<{ q?: string; type?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return null

  const searchParams = await props.searchParams
  const query = searchParams?.q?.toLowerCase() ?? ""
  const typeFilter = searchParams?.type ?? ""

  const userId = parseInt(session.user.id)
  const wines = await prisma.wine.findMany({
    where: {
      userId,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { producer: { contains: query, mode: "insensitive" } },
          { varietal: { contains: query, mode: "insensitive" } },
          { region: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { _count: { select: { tastings: true } } },
    orderBy: { createdAt: "desc" },
  })

  const avgRatings = wines.length > 0
    ? await Promise.all(
        wines.map(async (wine) => {
          const result = await prisma.tasting.aggregate({
            where: { wineId: wine.id },
            _avg: { rating: true },
          })
          return { wineId: wine.id, avg: result._avg.rating ?? 0 }
        }),
      )
    : []

  const ratingMap = Object.fromEntries(avgRatings.map((r) => [r.wineId, Math.round(r.avg)]))

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-wine-800">Mine viner</h1>
          <span className="text-xs text-wine-400">
            {wines.length} {wines.length === 1 ? "vin" : "viner"}
          </span>
        </div>
        <SearchAndFilter initialQuery={query} initialType={typeFilter} />
      </div>

      <div className="flex-1 px-4 pb-4">
        {wines.length === 0 ? (
          <div className="text-center py-16">
            <Grape className="w-14 h-16 mx-auto text-wine-300" />
            <p className="text-wine-700 mt-4 font-medium">
              {query || typeFilter ? "Ingen viner matchet søket" : "Ingen viner registrert ennå"}
            </p>
            <p className="text-wine-400 text-sm mt-1">
              {query || typeFilter
                ? "Prøv et annet søk eller filter"
                : 'Trykk på "Legg til" nederst og kom i gang'}
            </p>
            {!query && !typeFilter && (
              <Link
                href="/viner/ny"
                className="inline-block mt-6 rounded-full bg-wine-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-wine-700 transition-colors"
              >
                + Legg til vin
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {wines.map((wine, i) => {
              const avg = ratingMap[wine.id]
              return (
                <Link
                  key={wine.id}
                  href={`/viner/${wine.id}`}
                  className="block rounded-2xl bg-white p-4 border border-cream-200 hover:border-wine-300 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    {wine.image ? (
                      <img
                        src={wine.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5 border border-cream-200"
                      />
                    ) : i % 3 === 0 ? (
                      <WineBottle className="w-4 h-10 text-wine-300 shrink-0 mt-1" />
                    ) : i % 3 === 1 ? (
                      <Grape className="w-5 h-7 text-wine-400 shrink-0 mt-1" />
                    ) : (
                      <WineGlass className="w-4 h-5 text-wine-300 shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-wine-900 truncate text-base">{wine.name}</h2>
                      <p className="text-sm text-wine-600 truncate">
                        {wine.producer}
                        {wine.vintage && `, ${wine.vintage}`}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {wine.type && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-wine-50 text-wine-600 border border-wine-100">
                            {typeLabel(wine.type)}
                          </span>
                        )}
                        {wine.varietal && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream-100 text-cream-800 border border-cream-200">
                            {wine.varietal}
                          </span>
                        )}
                        {wine.country && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream-100 text-cream-800 border border-cream-200">
                            {wine.country}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-cream-100">
                    <div className="flex items-center gap-2">
                      {avg > 0 && <StaticStars rating={avg} />}
                    </div>
                    <span className="text-xs text-wine-400">
                      {wine._count.tastings} smaksnotat{wine._count.tastings !== 1 ? "er" : ""}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
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
