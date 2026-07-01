"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { WineForm } from "@/app/_components/wine-form"
import { VinmonopoletSearch } from "@/app/_components/vinmonopolet-search"
import { ModeLogo } from "@/app/_components/mode-text"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { recognizeLabel, disposeLabelWorker } from "@/lib/ocr"

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

type PhotoStatus =
  | "idle"
  | "ocr"
  | "searching"
  | "done"
  | "no-text"
  | "error"

/** Friendly Norwegian label for the current OCR progress bucket. */
function ocrProgressLabel(progress: number): string {
  if (progress < 0.3) return "Forbereder tekstgjenkjenning\u2026"
  if (progress < 0.7) return "Klargj\u00f8r bilde\u2026"
  return "Leser tekst\u2026"
}

export default function NewWinePage() {
  const { isBeer } = useBeerMode()
  const [wineapiQuery, setWineapiQuery] = useState("")
  const [wineapiResults, setWineapiResults] = useState<WineapiHit[]>([])
  const [wineapiLoading, setWineapiLoading] = useState(false)
  const [wineapiError, setWineapiError] = useState<string | null>(null)
  const [noKey, setNoKey] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Photo / OCR state -- the tesseract.js worker is module-singleton
  // inside @/lib/ocr; we only own UI state here.
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoThumb, setPhotoThumb] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle")
  const [photoProgress, setPhotoProgress] = useState(0)
  const [photoExtracted, setPhotoExtracted] = useState<string | null>(null)
  const [photoVintage, setPhotoVintage] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

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
        if (data.error?.includes("API-n\u00f8kkel")) {
          setNoKey(true)
          setWineapiResults([])
          return
        }
        throw new Error(data.error ?? "S\u00f8k feilet")
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "S\u00f8k feilet")
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

  // -------------------------------------------------------------------------
  // Photo / OCR handlers. The tesseract.js worker lives in @/lib/ocr as a
  // module-level singleton so the first run pays a 5-10s cold start
  // (lang-data download + WASM), and retries are cheap.
  // -------------------------------------------------------------------------

  function handlePhotoClick() {
    setPhotoError(null)
    setPhotoExtracted(null)
    setPhotoVintage(null)
    setPhotoStatus("idle")
    photoInputRef.current?.click()
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setPhotoError(null)
    setPhotoExtracted(null)
    setPhotoVintage(null)
    setPhotoProgress(0)
    setPhotoStatus("ocr")

    if (photoThumb) URL.revokeObjectURL(photoThumb)
    setPhotoThumb(URL.createObjectURL(file))

    try {
      const ocr = await recognizeLabel(file, ({ progress }) =>
        setPhotoProgress(progress),
      )
      if (!ocr.query) {
        setPhotoStatus("no-text")
        return
      }
      setPhotoExtracted(ocr.query)
      setPhotoVintage(ocr.vintage)
      // Pipe the cleaned OCR query into the existing text-search so the
      // wineapiResults list / prefill flow below is shared with the
      // manual search box.
      setPhotoStatus("searching")
      setWineapiQuery(ocr.query)
      await searchWineapi(ocr.query)
      setPhotoStatus("done")
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : "Tekstgjenkjenning feilet. Bruk s\u00f8ket over.",
      )
      setPhotoStatus("error")
    }
  }

  // Release the photo thumbnail blob URL when it changes (user picks
  // again) or when the page unmounts.
  useEffect(() => {
    return () => {
      if (photoThumb) URL.revokeObjectURL(photoThumb)
    }
  }, [photoThumb])

  // Tear down the singleton OCR worker on page unmount so a 10MB+
  // Worker + WASM + lang-data buffers don't leak past navigation.
  useEffect(() => {
    return () => {
      disposeLabelWorker()
    }
  }, [])

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

  const isPhotoBusy = photoStatus === "ocr" || photoStatus === "searching"

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10 relative">
        <div className="flex items-center gap-3 mb-2">
          <ModeLogo className="w-9 h-9" />
          <div>
            <h1 className="text-xl font-bold">{isBeer ? "Nytt \u00f8l" : "Ny vin"}</h1>
            <p className="text-wine-200 text-sm">{isBeer ? "S\u00f8k etter \u00f8l eller fyll inn manuelt" : "S\u00f8k etter vin eller fyll inn manuelt"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-wine-500 uppercase tracking-wider">
              {isBeer ? "S\u00f8k etter \u00f8l" : "S\u00f8k etter vin"}
            </label>
            <div className="relative">
              <input
                value={wineapiQuery}
                onChange={(e) => handleWineapiQuery(e.target.value)}
                placeholder={isBeer ? "S\u00f8k etter \u00f8l, produsent..." : "S\u00f8k etter vin, produsent..."}
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
                  S\u00f8ker...
                </span>
              )}
              {wineapiError && <p className="text-xs text-red-500">{wineapiError}</p>}
              {noKey && (
                <p className="text-xs text-amber-600">
                  Ingen wineapi.io-n\u00f8kkel funnet.{" "}
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

          {/* Photo / OCR section -- user picks a JPG/PNG/WebP, we run
              tesseract.js client-side (eng+nor) and pipe the cleaned
              query into the wineapi search above. No API key needed
              for OCR itself, only for the search step (noKey UX
              already shown in the search card). */}
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
            disabled={isPhotoBusy}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3l2-2h8l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 3a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            {photoStatus === "ocr"
              ? `Leser etiketten\u2026 ${Math.round(photoProgress * 100)}%`
              : photoStatus === "searching"
                ? "S\u00f8ker i vinregister\u2026"
                : "Skann etikett med tekstgjenkjenning"}
          </button>

          {photoThumb && (
            <div className="flex items-start gap-3 animate-fade-in">
              <img
                src={photoThumb}
                alt="Innsendt bilde"
                className="w-20 h-20 rounded-xl object-cover border border-cream-200 shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-[0] text-xs space-y-2 text-wine-500">
                {photoStatus === "ocr" && (
                  <>
                    <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-wine-400 transition-all duration-300"
                        style={{ width: `${Math.round(photoProgress * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-wine-400">
                      {ocrProgressLabel(photoProgress)}
                    </p>
                  </>
                )}
                {photoStatus === "searching" && (
                  <span className="flex items-center gap-2 text-wine-400">
                    <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
                    S\u00f8ker i wineapi.io\u2026
                  </span>
                )}
                {photoStatus === "done" && photoExtracted && (
                  <p>
                    Lest av etikett:{" "}
                    <span className="font-medium text-wine-700">{photoExtracted}</span>
                    {photoVintage && (
                      <span className="ml-1 text-wine-400">(\u00e5rgang {photoVintage})</span>
                    )}
                  </p>
                )}
                {photoStatus === "no-text" && (
                  <p className="text-amber-600">
                    Klarte ikke \u00e5 lese etiketten. Bruk s\u00f8ket over eller fyll inn manuelt.
                  </p>
                )}
                {photoStatus === "error" && (
                  <p className="text-red-500">{photoError}</p>
                )}
              </div>
            </div>
          )}

          <details className="group">
            <summary className="text-xs text-wine-500 cursor-pointer hover:text-wine-700 transition-colors select-none">
              S\u00f8k i Vinmonopolet som fallback
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
