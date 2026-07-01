"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { StaticStars } from "@/app/_components/star-rating"
import { SearchAndFilter } from "./search-filter"
import { typeLabel } from "@/lib/beer"
import { useWines } from "@/hooks/use-data"
import { HomeSkeleton } from "@/app/_components/skeletons"

export default function HomePage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.toLowerCase() ?? ""
  const typeFilter = searchParams.get("type") ?? ""
  const showAll = searchParams.get("all") === "1"
  const { isBeer } = useBeerMode()
  const { wines, loading } = useWines()

  const { filtered, cellarCount } = useMemo(() => {
    const cellarCount = wines.filter((w: any) => w.inCellar).length

    let filtered = wines
    if (!showAll) {
      filtered = filtered.filter((w: any) => w.inCellar)
    }
    if (typeFilter) {
      filtered = filtered.filter((w: any) => w.type === typeFilter)
    }
    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter((w: any) =>
        [w.name, w.producer, w.varietal, w.region, w.country]
          .some((f) => f?.toLowerCase().includes(q)),
      )
    }
    return { filtered, cellarCount }
  }, [wines, showAll, typeFilter, query])

  if (loading) return <HomeSkeleton />

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-wine-900 tracking-tight">
            {showAll ? (isBeer ? "Alt øl" : "Alle viner") : isBeer ? "Ølkasse" : "Vinskap"}
          </h1>
          <span className="text-xs font-medium text-wine-400 bg-wine-50 border border-wine-100 rounded-full px-3 py-1">
            {filtered.length} {isBeer ? "øl" : filtered.length === 1 ? "vin" : "viner"}
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
            href={showAll ? "/" : "/?all=0"}
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
        {filtered.length === 0 ? (
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
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
            {filtered.map((wine: any, i: number) => {
              const avg = wine.avgRating ?? 0
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
                              {typeLabel(wine.type)}
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
                        {wine._count?.tastings ?? 0} smaksnotat{wine._count?.tastings !== 1 ? "er" : ""}
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
