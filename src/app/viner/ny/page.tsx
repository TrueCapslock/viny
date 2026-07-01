"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { WineForm } from "@/app/_components/wine-form"
import { VinmonopoletSearch } from "@/app/_components/vinmonopolet-search"
import { ModeLogo } from "@/app/_components/mode-text"
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

type PhotoIdentifyMatch = {
  wine: {
    id: number
    name: string
    vintage: number | null
    winery: string | null
  }
  score: number
  region: string | null
  varietal: string | null
}

export default function NewWinePage() {
  const { isBeer } = useBeerMode()
  const [wineapiQuery, setWineapiQuery] = useState("")
  const [wineapiResults, setWineapiResults] = useState<WineapiHit[]>([])
  const [wineapiLoading, setWineapiLoading] = useState(false)
  const [wineapiError, setWineapiError] = useState<string | null>(null)
  const [noKey, setNoKey] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Photo-identification state. `photoResults === null` means the user
  // hasn't picked a photo yet; an empty array means they did and the
  // service returned nothing.
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoResults, setPhotoResults] = useState<PhotoIdentifyMatch[] | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoThumb, setPhotoThumb] = useState<string | null>(null)
  // Mirrors the wineapi text-search `noKey` affordance -- a dedicated
  // boolean that renders an amber "Legg til i profilen" hint instead of
  // a generic red error when the user lacks an API key.
  const [photoNoKey, setPhotoNoKey] = useState(false)

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

  // Photo-identify handlers
  function handlePhotoClick() {
    setPhotoError(null)
    setPhotoNoKey(false)
    setPhotoResults(null)
    photoInputRef.current?.click()
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Allow re-picking the same file later by clearing the input value.
    e.target.value = ""
    if (!file) return

    setPhotoError(null)
    setPhotoResults(null)
    setPhotoLoading(true)

    // Keep a tiny URL.createObjectURL preview so the user sees what they
    // submitted; revoke it when a match is picked or we replace it.
    if (photoThumb) URL.revokeObjectURL(photoThumb)
    setPhotoThumb(URL.createObjectURL(file))

    try {
      const fd = new FormData()
      fd.set("image", file)
      const res = await fetch("/api/wineapi/identify", { method: "POST", body: fd })
      if (res.status === 400) {
        const data = await res.json().catch(() => null)
        if (typeof data?.error === "string" && data.error.includes("API-nøkkel")) {
          setPhotoNoKey(true)
          setPhotoResults([])
          return
        }
        throw new Error(data?.error ?? "Identifisering feilet")
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Identifisering feilet")
      }
      setPhotoNoKey(false)
      const data: PhotoIdentifyMatch[] = await res.json()
      setPhotoResults(data)
      // Note: photoNoKey stays false here because handlePhotoClick already
      // reset it before opening the picker, so the noKey path can't carry
      // into a successful response.
      if (data.length === 0) {
        setPhotoError("Ingen treff. Prøv et skarpere bilde av etiketten.")
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Ukjent feil")
      setPhotoResults([])
    }
    setPhotoLoading(false)
  }

  // Release any object URL we created for the photo thumbnail when it
  // changes (or the page unmounts) to avoid leaking the underlying Blob.
  // Pairs with the explicit revoke inside handlePhotoChange -- that one
  // covers the user-picks-again case; this one covers the
  // page-unmounts case.
  useEffect(() => {
    return () => {
      if (photoThumb) URL.revokeObjectURL(photoThumb)
    }
  }, [photoThumb])

  function handlePhotoMatchSelect(match: PhotoIdentifyMatch) {
    setSelectedId(null)
    setPrefill({
      name: match.wine.name,
      producer: match.wine.winery ?? "",
      vintage: match.wine.vintage?.toString() ?? "",
      varietal: match.varietal ?? "",
      region: match.region ?? "",
      country: "",
      type: "",
    })
    setShowForm(true)
    // Keep the photo thumbnail visible until the user picks again.
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
          <ModeLogo className="w-9 h-9" />
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

          {/* Photo-identification section -- uses the same wineapi key but
              wineapi.io /v4/identify/image to OCR the bottle label. */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={photoLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3l2-2h8l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 3a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            {photoLoading
              ? "Identifiserer..."
              : isBeer
                ? "Identifiser fra bilde av etikett"
                : "Identifiser fra bilde av etikett"}
          </button>

          {photoThumb && (
            <div className="flex items-start gap-3 animate-fade-in">
              <img
                src={photoThumb}
                alt="Innsendt bilde"
                className="w-20 h-20 rounded-xl object-cover border border-cream-200 shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-[0] text-xs text-wine-500">
                {photoLoading && (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
                    wineapi.io ser på etiketten...
                  </span>
                )}
                {photoError && !photoLoading && (
                  <p className="text-red-500">{photoError}</p>
                )}
                {photoResults && !photoLoading && !photoError && !photoNoKey && (
                  <p>
                    {photoResults.length === 1
                      ? "1 forslag -- trykk for å fylle ut skjemaet."
                      : `${photoResults.length} forslag sortert etter treffsikkerhet.`}
                  </p>
                )}
                {photoNoKey && !photoLoading && (
                  <p className="text-amber-600">
                    Ingen wineapi.io-nøkkel funnet.{" "}
                    <a href="/profil" className="underline hover:text-amber-800">Legg til i profilen</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {photoResults && photoResults.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-cream-200 bg-white shadow-lg shadow-wine-900/5 animate-fade-in">
              {photoResults.map((match, idx) => (
                <button
                  // Each match has no stable id from wineapi for the OCR list
                  // (only the nested wine.id, which isn't always unique-ish),
                  // so use the index as key after a stable stringification.
                  key={`${match.wine.id}-${match.wine.vintage ?? "-"}-${match.wine.winery ?? "-"}-${idx}`}
                  onClick={() => handlePhotoMatchSelect(match)}
                  className="w-full text-left px-4 py-3 text-sm border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-wine-800">{match.wine.name}</span>
                      {match.wine.vintage && (
                        <span className="text-wine-500 ml-1">({match.wine.vintage})</span>
                      )}
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        {match.wine.winery && <span className="text-xs text-wine-500">{match.wine.winery}</span>}
                        {match.region && <span className="text-xs text-wine-400">{match.region}</span>}
                        {match.varietal && <span className="text-xs text-wine-400">{match.varietal}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                          match.score >= 0.7
                            ? "bg-gold-100 text-gold-700"
                            : match.score >= 0.4
                              ? "bg-cream-100 text-cream-700"
                              : "bg-wine-50 text-wine-500"
                        }`}
                      >
                        {Math.round(match.score * 100)}%
                      </span>
                      <p className="text-[10px] text-wine-400 mt-1 uppercase tracking-wider">match</p>
                    </div>
                  </div>
                </button>
              ))}
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
