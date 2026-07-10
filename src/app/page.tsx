"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { WineCard, type WineCardData } from "@/app/_components/wine-card"
import { SearchAndFilter } from "./search-filter"
import { useWines } from "@/hooks/use-data"
import { HomeSkeleton } from "@/app/_components/skeletons"

export default function HomePage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.toLowerCase() ?? ""
  const typeFilter = searchParams.get("type") ?? ""
  const showAll = searchParams.get("all") === "1"
  // Threaded onto each WineCard's link as `?from=…` so the wine-detail
  // back-button restores the exact cellar view (incl. active filters)
  // we came from. `/` when no filters are active; `/?…` otherwise.
  const from = searchParams.toString() ? `/?${searchParams.toString()}` : "/"
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
            {isBeer ? `I ølkassen${cellarCount > 0 ? ` (${cellarCount})` : ""}` : `I vinskapet${cellarCount > 0 ? ` (${cellarCount})` : ""}`}
          </Link>
        </div>
        <SearchAndFilter key={`${query}-${typeFilter}`} initialQuery={query} initialType={typeFilter} />
      </div>

      <div className="flex-1 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-wine-50 border border-wine-100 flex items-center justify-center mx-auto">
              <img src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"} alt="" className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-wine-800 font-semibold mt-5 text-lg">
              {query || typeFilter ? "Ingen treff" : showAll ? (isBeer ? "Velkommen til Humle" : "Velkommen til Uva") : isBeer ? "Tom ølkasse" : "Tomt vinskap"}
            </p>
            <p className="text-wine-400 text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
              {query || typeFilter
                ? "Prøv et annet søk eller filter"
                : showAll
                  ? isBeer ? 'Trykk på "Legg til" nederst og registrer ditt første øl' : 'Trykk på "Legg til" nederst og registrer din første vin'
                  : isBeer ? 'Merk øl som "I ølkassen" for å se dem her' : 'Merk viner som "I mitt vinskap" for å se dem her'}
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
              const card: WineCardData = {
                id: wine.id,
                name: wine.name,
                producer: wine.producer,
                vintage: wine.vintage,
                image: wine.image,
                type: wine.type,
                country: wine.country,
                inCellar: wine.inCellar,
                quantity: wine.quantity,
                avgRating: wine.avgRating,
                tastingCount: wine._count?.tastings,
              }
              return (
                <WineCard key={wine.id} wine={card} animationDelay={i * 50} from={from} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
