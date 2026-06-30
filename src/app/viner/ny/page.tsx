"use client"

import { useState, useCallback, useRef } from "react"
import { WineForm } from "@/app/_components/wine-form"
import { VinmonopoletSearch } from "@/app/_components/vinmonopolet-search"
import { Grape } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type Prefill = {
  name: string
  producer: string
  vintage: string
  varietal: string
  region: string
  country: string
  type: string
}

type WineapiHit = {
  id: number
  name: string
  vintage: number | null
  type: string | null
  winery: string | null
  region: string | null
  country: string | null
  averageRating: number | null
}

export default function NewWinePage() {
  const { isBeer } = useBeerMode()
  const [wineapiQuery, setWineapiQuery] = useState("")
  const [wineapiResults, setWineapiResults] = useState<WineapiHit[]>([])
  const [wineapiLoading, setWineapiLoading] = useState(false)
  const [wineapiError, setWineapiError] = useState<string | null>(null)
  const [noKey, setNoKey] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [showForm, setShowForm] = useState(false)

  const searchWineapi = useCallback(async (q: string) => {
    if (q.length < 2) {
      setWineapiResults([])
      setNoKey(false)
      return
    }
    setWineapiLoading(true)
    setWineapiError(null)
    setNoKey(false)
    try {
      const res = await fetch(`/api/wineapi/search?q=${encodeURIComponent(q)}`)
      if (res.status === 400) {
        const data = await res.json()
        if (data.error?.includes("API-nøkkel")) {
          setNoKey(true)
          setWineapiResults([])
          return
        }
        throw new Error(data.error ?? "Søk feilet")
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Søk feilet")
      }
      const data = await res.json()
      setWineapiResults(data)
    } catch (err) {
      setWineapiError(err instanceof Error ? err.message : "Ukjent feil")
      setWineapiResults([])
    }
    setWineapiLoading(false)
  }, [])

  function handleWineapiQuery(value: string) {
    setWineapiQuery(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => searchWineapi(value), 400)
  }

  function handleWineapiSelect(hit: WineapiHit) {
    setSelectedId(null)
    setPrefill({
      name: hit.name,
      producer: hit.winery ?? "",
      vintage: hit.vintage?.toString() ?? "",
      varietal: "",
      region: hit.region ?? "",
      country: hit.country ?? "",
      type: hit.type ?? "",
    })
    setShowForm(true)
    setWineapiQuery(hit.name)
    setWineapiResults([])
  }

  function handleVinmonopoletSelect(product: { productId: string; productShortName: string }) {
    if (!product.productId) {
      setSelectedId(null)
      setPrefill(null)
      setShowForm(false)
      return
    }
    setSelectedId(product.productId)
    const parts = product.productShortName.split(" ")
    const producer = parts.length > 1 ? parts.slice(0, Math.min(3, parts.length - 1)).join(" ") : ""
    setPrefill({ name: product.productShortName, producer, vintage: "", varietal: "", region: "", country: "", type: "" })
    setShowForm(true)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10 relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/15 rounded-xl p-1.5">
            <Grape className="w-5 h-6 text-gold-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isBeer ? "Nytt øl" : "Ny vin"}</h1>
            <p className="text-wine-200 text-sm">{isBeer ? "Søk etter øl eller fyll inn manuelt" : "Søk etter vin eller fyll inn manuelt"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-wine-500 uppercase tracking-wider">
              {isBeer ? "Søk etter øl" : "Søk etter vin"}
            </label>
            <div className="relative">
              <input
                value={wineapiQuery}
                onChange={(e) => handleWineapiQuery(e.target.value)}
                placeholder={isBeer ? "Søk etter øl, produsent..." : "Søk etter vin, produsent..."}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 pl-10 pr-4 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>

            <div className="flex items-center gap-2 min-h-[20px]">
              {wineapiLoading && (
                <span className="flex items-center gap-2 text-xs text-wine-400">
                  <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
                  Søker...
                </span>
              )}
              {wineapiError && <p className="text-xs text-red-500">{wineapiError}</p>}
              {noKey && (
                <p className="text-xs text-amber-600">
                  Ingen wineapi.io-nøkkel funnet.{isBeer ? "" : " "}
                  <a href="/profil" className="underline hover:text-amber-800">Legg til i profilen</a>
                </p>
              )}
            </div>

            {wineapiResults.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-cream-200 bg-white shadow-lg shadow-wine-900/5 animate-fade-in">
                {wineapiResults.map((hit) => (
                  <button
                    key={hit.id}
                    onClick={() => handleWineapiSelect(hit)}
                    className="w-full text-left px-4 py-3 text-sm border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors"
                  >
                    <span className="font-medium text-wine-800">{hit.name}</span>
                    {hit.vintage && <span className="text-wine-500 ml-1">({hit.vintage})</span>}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      {hit.winery && <span className="text-xs text-wine-500">{hit.winery}</span>}
                      {hit.country && <span className="text-xs text-wine-400">{hit.country}</span>}
                      {hit.region && <span className="text-xs text-wine-400">{hit.region}</span>}
                      {hit.type && <span className="text-xs text-wine-400 capitalize">{hit.type}</span>}
                      {hit.averageRating && (
                        <span className="text-xs text-gold-600">{hit.averageRating.toFixed(1)}/5</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {wineapiResults.length === 0 && !wineapiLoading && !noKey && wineapiQuery.length >= 2 && (
            <div className="text-center py-3">
              <p className="text-xs text-wine-400">Ingen treff i wineapi.io.</p>
            </div>
          )}

          <details className="group">
            <summary className="text-xs text-wine-500 cursor-pointer hover:text-wine-700 transition-colors select-none">
              Søk i Vinmonopolet som fallback
            </summary>
            <div className="mt-3">
              <VinmonopoletSearch selectedId={selectedId} onSelect={handleVinmonopoletSelect} />
            </div>
          </details>
        </div>

        {!showForm && (
          <p className="text-xs text-wine-400 px-1">
            Velg et treff over eller fyll inn manuelt under.
          </p>
        )}

        <div
          className={`transition-all duration-300 ${
            showForm ? "opacity-100 translate-y-0" : ""
          }`}
        >
          <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
            <WineForm
              key={prefill ? `${prefill.name}-${prefill.producer}-${prefill.vintage}` : "empty"}
              initial={
                prefill
                  ? {
                      name: prefill.name,
                      producer: prefill.producer,
                      vintage: prefill.vintage,
                      varietal: prefill.varietal,
                      region: prefill.region,
                      country: prefill.country,
                      type: prefill.type,
                      notes: "",
                      image: "",
                      inCellar: false,
                      quantity: "0",
                    }
                  : undefined
              }
              onSave={async (data) => {
                const res = await fetch("/api/viner", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                })
                if (!res.ok) {
                  const text = await res.text()
                  return { ok: false, error: text }
                }
                return { ok: true }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
