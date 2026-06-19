import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@/generated/prisma/client"
import { StaticStars } from "@/app/_components/star-rating"
import { SearchAndFilter } from "./search-filter"
import { typeLabel } from "@/lib/beer"

export default async function HomePage(props: { searchParams?: Promise<{ q?: string; type?: string; all?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return null

  const searchParams = await props.searchParams
  const query = searchParams?.q?.toLowerCase() ?? ""
  const typeFilter = searchParams?.type ?? ""
  const showAll = searchParams?.all === "1"

  const userId = parseInt(session.user.id)
  const isBeer = session.user.prefersBeer ?? false

  const sharedListIds = await prisma.sharedList.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  })

  const personalWhere = { userId, sharedListId: null }
  const sharedWhere = sharedListIds.length > 0
    ? { sharedListId: { in: sharedListIds.map((sl) => sl.id) } }
    : null

  function baseFilter(): Prisma.WineWhereInput[] {
    const filters: Prisma.WineWhereInput[] = [personalWhere]
    if (sharedWhere) filters.push(sharedWhere)
    return filters
  }

  function finalWhere(): Prisma.WineWhereInput {
    const filters = baseFilter()
    const ands: Prisma.WineWhereInput[] = [{ OR: filters }]
    if (!showAll) ands.push({ inCellar: true })
    if (typeFilter) ands.push({ type: typeFilter })
    if (query) {
      ands.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { producer: { contains: query, mode: "insensitive" } },
          { varietal: { contains: query, mode: "insensitive" } },
          { region: { contains: query, mode: "insensitive" } },
          { country: { contains: query, mode: "insensitive" } },
        ],
      })
    }
    return { AND: ands }
  }

  const cellarCount = await prisma.wine.count({
    where: {
      inCellar: true,
      OR: baseFilter(),
    },
  })

  const wines = await prisma.wine.findMany({
    where: finalWhere(),
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
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-wine-900 tracking-tight">
            {showAll ? (isBeer ? "Alt øl" : "Alle viner") : isBeer ? "Ølsamling" : "Vinskap"}
          </h1>
          <span className="text-xs font-medium text-wine-400 bg-wine-50 border border-wine-100 rounded-full px-3 py-1">
            {wines.length} {isBeer ? "øl" : wines.length === 1 ? "vin" : "viner"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showAll ? "/" : "/?all=1"}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              showAll
                ? "bg-wine-600 text-white shadow-sm"
                : "bg-cream-100 text-wine-600 hover:bg-cream-200 border border-cream-200"
            }`}
          >
            {isBeer ? "Alt øl" : "Alle viner"}
          </Link>
          <Link
            href={showAll ? "/?all=0" : "/"}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              !showAll
                ? "bg-wine-600 text-white shadow-sm"
                : "bg-cream-100 text-wine-600 hover:bg-cream-200 border border-cream-200"
            }`}
          >
            {isBeer ? `På lager${cellarCount > 0 ? ` (${cellarCount})` : ""}` : `I vinskapet${cellarCount > 0 ? ` (${cellarCount})` : ""}`}
          </Link>
        </div>
        <SearchAndFilter key={`${query}-${typeFilter}`} initialQuery={query} initialType={typeFilter} />
      </div>

      <div className="flex-1 px-4 pb-4">
        {wines.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-wine-50 border border-wine-100 flex items-center justify-center mx-auto">
              <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="" className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-wine-800 font-semibold mt-5 text-lg">
              {query || typeFilter ? "Ingen treff" : showAll ? (isBeer ? "Velkommen til Øly" : "Velkommen til Viny") : isBeer ? "Tom ølkasse" : "Tomt vinskap"}
            </p>
            <p className="text-wine-400 text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
              {query || typeFilter
                ? "Prøv et annet søk eller filter"
                : showAll
                  ? isBeer ? 'Trykk på "Legg til" nederst og registrer ditt første øl' : 'Trykk på "Legg til" nederst og registrer din første vin'
                  : isBeer ? 'Merk øl som "På lager" for å se dem her' : 'Merk viner som "I mitt vinskap" for å se dem her'}
            </p>
            {!query && !typeFilter && (
              <Link
                href="/viner/ny"
                className="inline-flex items-center gap-2 mt-6 rounded-full bg-wine-600 px-6 py-3 text-sm font-medium text-white hover:bg-wine-700 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg hover:shadow-wine-600/30 active:scale-[0.97]"
              >
                <span className="text-lg leading-none">+</span>
                {isBeer ? "Legg til øl" : "Legg til vin"}
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
                  className="block rounded-2xl bg-white border border-cream-200/80 card-hover shadow-sm"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3.5">
                      {wine.image ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-cream-200 shadow-sm">
                          <img
                            src={wine.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-wine-50 border border-wine-100 flex items-center justify-center shrink-0">
                          <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="" className="w-7 h-7 opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h2 className="font-bold text-wine-900 truncate text-[15px]">{wine.name}</h2>
                        <p className="text-sm text-wine-500 truncate">
                          {wine.producer}
                          {wine.vintage && `, ${wine.vintage}`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {wine.type && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-wine-50 text-wine-600 border border-wine-100/80">
                              {typeLabel(wine.type, isBeer)}
                            </span>
                          )}
                          {wine.varietal && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-100 text-cream-700 border border-cream-200/80">
                              {wine.varietal}
                            </span>
                          )}
                          {wine.country && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-100 text-cream-700 border border-cream-200/80">
                              {wine.country}
                            </span>
                          )}
                          {wine.inCellar && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200/80">
                              {wine.quantity > 0 ? `${wine.quantity} ${isBeer ? "stk." : "fl."}` : isBeer ? "På lager" : "I vinskap"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-100/80">
                      <div className="flex items-center gap-2">
                        {avg > 0 && <StaticStars rating={avg} />}
                      </div>
                      <span className="text-[11px] text-wine-400 font-medium">
                        {wine._count.tastings} smaksnotat{wine._count.tastings !== 1 ? "er" : ""}
                      </span>
                    </div>
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
