"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { WineForm } from "@/app/_components/wine-form"
import { VinmonopoletSearch } from "@/app/_components/vinmonopolet-search"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { recognizeLabel, disposeLabelWorker, buildSearchQuery } from "@/lib/ocr"
import { BarcodeScanner } from "@/app/_components/barcode-scanner"

type Prefill = {
  name: string
  producer: string
  vintage: string
  varietal: string
  region: string
  country: string
  type: string
  // v0.18.0: EAN-13 / EAN-8 / UPC-A from the barcode scanner. The
  // WineForm renders a small chip when this is set and clears the
  // column to null on save if the chip was removed. Optional so the
  // historic flow (text search + OCR + Vinmonopolet) is unchanged.
  ean?: string
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

type AiStatus =
  | "idle"
  | "loading"
  | "searching"
  | "done"
  | "no-text"
  | "error"

/** Friendly Norwegian label for the current OCR progress bucket. */
function ocrProgressLabel(progress: number): string {
  if (progress < 0.3) return "Forbereder tekstgjenkjenning…"
  if (progress < 0.7) return "Klargjør bilde…"
  return "Leser tekst…"
}

/**
 * Resize an image to a maximum dimension (longest side) and re-encode
 * as JPEG at the given quality. The OpenRouter route body lives behind
 * a 4.5MB Vercel/Next.js limit so we can't ship a 5MB phone photo
 * straight to the server -- resize to ~1024px which yields a 100-300KB
 * JPEG for typical wine-label photos while preserving text legibility
 * for the LLM.
 */
async function resizeImage(
  file: Blob,
  maxDim = 1024,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(
    1,
    maxDim / Math.max(bitmap.width, bitmap.height),
  )
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context not available")
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/jpeg",
      quality,
    )
  })
}

export default function NewWinePage() {
  const { isBeer } = useBeerMode()
  const { data: session, status: sessionStatus } = useSession()
  // Only treat the OpenRouter key as missing once the session has
  // resolved -- on the first render useSession() returns
  // `status: "loading"` and `session === undefined`, so the
  // hasOpenRouterKey derivation must defer to avoid falsely showing
  // the noKey state on cold load and stranding the user in it.
  const sessionLoaded = sessionStatus !== "loading"
  const hasOpenRouterKey =
    sessionLoaded && Boolean(session?.user?.openRouterKey)

  const [wineapiQuery, setWineapiQuery] = useState("")
  const [wineapiResults, setWineapiResults] = useState<WineapiHit[]>([])
  const [wineapiLoading, setWineapiLoading] = useState(false)
  const [wineapiError, setWineapiError] = useState<string | null>(null)
  const [noKey, setNoKey] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Local tesseract.js (v0.11.0) state. Stays as the no-key fallback
  // for users without an OpenRouter key.
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoThumb, setPhotoThumb] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle")
  const [photoProgress, setPhotoProgress] = useState(0)
  const [photoExtracted, setPhotoExtracted] = useState<string | null>(null)
  const [photoVintage, setPhotoVintage] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // OpenRouter free-vision (v0.12.0) state. Parallel state machine to
  // the local tesseract one; both paths pipe their extracted text
  // into the same handleWineapiQuery so the wineapiResults list is
  // shared.
  const aiInputRef = useRef<HTMLInputElement>(null)
  const [aiThumb, setAiThumb] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle")
  const [aiExtracted, setAiExtracted] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiNoKey, setAiNoKey] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [showForm, setShowForm] = useState(false)

  // v0.18.0: EAN barcode scanner sub-flow. Mirrors the photo/ai state
  // machines: a button toggles a camera modal, the modal fires onDetected
  // once, and the result envelope routes through wineapiResults + prefill
  // so the rest of the page doesn't need to learn about it.
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [barcodeStatus, setBarcodeStatus] = useState<
    "idle" | "looking-up" | "found" | "not-found" | "error"
  >("idle")

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

  // -------------------------------------------------------------------------
  // Local tesseract.js flow (v0.11.0 fallback). Cold start: 5-10s for
  // lang-data + WASM download; subsequent picks are fast because the
  // singleton worker is reused.
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
      setPhotoStatus("searching")
      setWineapiQuery(ocr.query)
      await searchWineapi(ocr.query)
      setPhotoStatus("done")
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : "Tekstgjenkjenning feilet. Bruk søket over.",
      )
      setPhotoStatus("error")
    }
  }

  useEffect(() => {
    return () => {
      if (photoThumb) URL.revokeObjectURL(photoThumb)
    }
  }, [photoThumb])

  useEffect(() => {
    return () => {
      disposeLabelWorker()
    }
  }, [])

  // -------------------------------------------------------------------------
  // OpenRouter free-vision flow (v0.12.0). Server-side route POSTs the
  // resized image to https://openrouter.ai/api/v1/chat/completions
  // using the user's saved key + vision model. Pipes the LLM text
  // through buildSearchQuery for consistent query assembly.
  // -------------------------------------------------------------------------

  function handleAiPhotoClick() {
    if (!sessionLoaded) return
    if (!hasOpenRouterKey) {
      setAiNoKey(true)
      return
    }
    setAiNoKey(false)
    setAiError(null)
    setAiExtracted(null)
    setAiStatus("idle")
    aiInputRef.current?.click()
  }

  async function handleAiPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!sessionLoaded || !hasOpenRouterKey) {
      setAiNoKey(true)
      return
    }

    setAiNoKey(false)
    setAiError(null)
    setAiExtracted(null)
    setAiStatus("loading")

    if (aiThumb) URL.revokeObjectURL(aiThumb)
    setAiThumb(URL.createObjectURL(file))

    try {
      const resized = await resizeImage(file)
      const fd = new FormData()
      fd.set("image", resized, "label.jpg")
      const res = await fetch("/api/ocr-vision", {
        method: "POST",
        body: fd,
      })
      if (res.status === 400) {
        const data = await res.json().catch(() => null)
        if (
          typeof data?.error === "string" &&
          data.error.includes("OpenRouter API-nøkkel")
        ) {
          setAiNoKey(true)
          setAiStatus("idle")
          return
        }
        throw new Error(data?.error ?? "AI-skann feilet")
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "AI-skann feilet")
      }
      const data = (await res.json()) as { text?: string }
      const raw = typeof data.text === "string" ? data.text : ""
      const { query } = buildSearchQuery(raw)
      if (!query) {
        setAiStatus("no-text")
        return
      }
      setAiExtracted(query)
      setAiStatus("searching")
      setWineapiQuery(query)
      await searchWineapi(query)
      setAiStatus("done")
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "AI-skanning feilet",
      )
      setAiStatus("error")
    }
  }

  // Mirror the tesseract.js pattern: release the thumbnail blob URL
  // when the user picks again or on unmount.
  useEffect(() => {
    return () => {
      if (aiThumb) URL.revokeObjectURL(aiThumb)
    }
  }, [aiThumb])

  // -------------------------------------------------------------------------
  // v0.18.0 EAN barcode flow.
  //
  // The scanner component is responsible for camera + decode + EAN
  // normalisation. This handler is responsible for everything that
  // happens AFTER the EAN is in hand:
  //
  //   1. POST /api/barcode/lookup -- the server runs OFF + optional
  //      wineapi.io text-search using the same key the user has saved.
  //   2. Branch on what came back:
  //        a. wineapiHits.length > 0  -> setWineapiResults so the
  //           existing WineapiHit dropdown renders, exactly like the
  //           OCR flow. The user picks from a structured candidate.
  //        b. OFF  has a product_name  -> push it through the same
  //           searchWineapi() callback so any cross-listed matches
  //           surface; prefill form fields with OFF metadata so the
  //           user sees the OFF brand/country inline.
  //        c. both empty               -> EAN chip only, rest blank.
  //
  //   In every branch `ean` is funneled into Prefill.ean so the
  //   WineForm initial renders the read-only EAN chip and the column
  //   gets persisted on save.
  // -------------------------------------------------------------------------
  async function handleBarcodeDetected(ean: string) {
    setScannerOpen(false)
    setBarcodeError(null)
    setBarcodeStatus("looking-up")
    try {
      const res = await fetch("/api/barcode/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ean }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Oppslag feilet")
      }
      const data = (await res.json()) as {
        ean: string
        off: {
          name: string | null
          brand: string | null
          country: string | null
          image: string | null
        } | null
        wineapiStatus: "hit" | "miss" | "no-key" | "error"
        wineapiHits: WineapiHit[]
        wineapiError: string | null
      }
      const offName = data.off?.name ?? null
      const offBrand = data.off?.brand ?? null
      const offCountry = data.off?.country ?? null
      const offImage = data.off?.image ?? null
      const wineapiHits = Array.isArray(data.wineapiHits) ? data.wineapiHits : []

      if (wineapiHits.length > 0) {
        // Best case: the user picks a structured candidate.
        setWineapiQuery(wineapiHits[0].name)
        setWineapiResults(wineapiHits)
      } else if (offName) {
        // Mid case: OFF gave us a name but wineapi missed. Run the
        // OFF name through the same wineapi pipeline so any
        // cross-listed matches surface, and prefill the rest with
        // OFF's metadata.
        setWineapiQuery(offName)
        await searchWineapi(offName)
      } else {
        setWineapiQuery("")
        setWineapiResults([])
      }

      setPrefill({
        name: offName ?? "",
        producer: offBrand ?? "",
        vintage: "",
        varietal: "",
        region: "",
        country: offCountry ?? "",
        type: "",
        ean,
      })
      // If OFF surfaced a product image we'll seed the form's
      // image upload slot so the user sees it inline. Same string
      // contract /api/viner POST already accepts. Falls through to
      // empty string when OFF has nothing.
      setShowForm(true)
      setBarcodeStatus(offName || wineapiHits.length > 0 ? "found" : "not-found")
      // Note: we can't thread `offImage` into the Form's prefill
      // through Prefill (which only carries Wine-shape fields). The
      // upstream `/viner/ny` doesn't ship an image prefill consumer
      // either; users fall back to the Velg bilde button. We surface
      // offImage in the inline result chip below as a hint.
      void offImage
    } catch (err) {
      // The EAN itself is already known at this point; surface an
      // error pill but still open the form with just the EAN so the
      // user can fill the rest manually without losing it.
      setBarcodeError(err instanceof Error ? err.message : "Ukjent feil")
      setBarcodeStatus("error")
      setPrefill({
        name: "",
        producer: "",
        vintage: "",
        varietal: "",
        region: "",
        country: "",
        type: "",
        ean,
      })
      setShowForm(true)
    }
  }

  // -------------------------------------------------------------------------
  // Vinmonopolet fallback selection (unchanged).
  // -------------------------------------------------------------------------

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
  const isAiBusy = aiStatus === "loading" || aiStatus === "searching"

  return (
    <div className="flex-1 flex flex-col px-4 pt-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-wine-900 tracking-tight mb-1">
        {isBeer ? "Nytt øl" : "Ny vin"}
      </h1>
      <p className="text-sm text-wine-500 mb-4">
        {isBeer
          ? "Søk etter øl eller fyll inn manuelt"
          : "Søk etter vin eller fyll inn manuelt"}
      </p>

      <div className="space-y-4">
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
                  Ingen wineapi.io-nøkkel funnet.{" "}
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

          {/* v0.18.0 EAN barcode scanner -- the no-key, lowest-friction
              option. Sits between the wineapi text search and the OCR
              buttons so the user sees it as a peer ("type / scan /
              upload-photo"). Inline status chip surfaces OFF or
              wineapi results inline so the user doesn't have to wait
              for the form to confirm. The button is persistently
              tappable; opening the scanner a second time dismounts
              the previous instance and tears down its camera stream. */}
          <button
            type="button"
            onClick={() => {
              setBarcodeError(null)
              setBarcodeStatus("idle")
              setScannerOpen((open) => !open)
            }}
            disabled={barcodeStatus === "looking-up"}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-wine-200 bg-gradient-to-r from-wine-50 to-wine-100 px-4 py-2.5 text-sm font-medium text-wine-700 hover:border-wine-400 hover:from-wine-100 hover:to-wine-200 transition-all disabled:opacity-50"
            aria-expanded={scannerOpen}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5v14M7 5v14M11 5v14M15 9v6M19 5v14"
              />
            </svg>
            {barcodeStatus === "looking-up"
              ? "Leter opp produkt…"
              : scannerOpen
                ? "Skanner (trykk for å lukke)"
                : "Skann strekkode (EAN)"}
          </button>

          {barcodeError && (
            <p className="text-xs text-red-500">{barcodeError}</p>
          )}

          {scannerOpen && (
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              onClose={() => setScannerOpen(false)}
            />
          )}

          {/* Local tesseract.js (v0.11.0) -- no-key, offline-capable fallback. */}
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
            className="hidden w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3l2-2h8l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 3a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            {photoStatus === "ocr"
              ? `Leser etiketten… ${Math.round(photoProgress * 100)}%`
              : photoStatus === "searching"
                ? "Søker i vinregister…"
                : "Skann etikett (lokalt)"}
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
                    Søker i wineapi.io…
                  </span>
                )}
                {photoStatus === "done" && photoExtracted && (
                  <p>
                    Lokalt lest:{" "}
                    <span className="font-medium text-wine-700">{photoExtracted}</span>
                    {photoVintage && (
                      <span className="ml-1 text-wine-400">(årgang {photoVintage})</span>
                    )}
                  </p>
                )}
                {photoStatus === "no-text" && (
                  <p className="text-amber-600">
                    Klarte ikke å lese etiketten lokalt. Prøv AI-knappen under.
                  </p>
                )}
                {photoStatus === "error" && (
                  <p className="text-red-500">{photoError}</p>
                )}
              </div>
            </div>
          )}

          {/* OpenRouter free-vision (v0.12.0) -- server-side, better on
              stylized labels but needs a saved OpenRouter key. */}
          <input
            ref={aiInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleAiPhotoChange}
          />
          <button
            type="button"
            onClick={handleAiPhotoClick}
            disabled={isAiBusy || !sessionLoaded}
            className="hidden w-full flex items-center justify-center gap-2 rounded-xl border border-wine-200 bg-wine-50 px-4 py-2.5 text-sm font-medium text-wine-700 hover:border-wine-400 hover:bg-wine-100 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            {aiStatus === "loading"
              ? "AI leser etiketten…"
              : aiStatus === "searching"
                ? "Søker i vinregister…"
                : "Prøv med AI (OpenRouter)"}
          </button>

          {aiThumb && (
            <div className="flex items-start gap-3 animate-fade-in">
              <img
                src={aiThumb}
                alt="Innsendt bilde (AI)"
                className="w-20 h-20 rounded-xl object-cover border border-cream-200 shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-[0] text-xs space-y-2 text-wine-500">
                {aiStatus === "loading" && (
                  <span className="flex items-center gap-2 text-wine-400">
                    <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
                    OpenRouter analyserer…
                  </span>
                )}
                {aiStatus === "searching" && (
                  <span className="flex items-center gap-2 text-wine-400">
                    <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
                    Søker i wineapi.io…
                  </span>
                )}
                {aiStatus === "done" && aiExtracted && (
                  <p>
                    AI leste:{" "}
                    <span className="font-medium text-wine-700">{aiExtracted}</span>
                  </p>
                )}
                {aiStatus === "no-text" && (
                  <p className="text-amber-600">
                    AI fant ikke nok tekst på etiketten. Bruk søket over eller fyll inn manuelt.
                  </p>
                )}
                {aiStatus === "error" && (
                  <p className="text-red-500">{aiError}</p>
                )}
                {aiNoKey && (
                  <p className="text-amber-600">
                    Ingen OpenRouter-nøkkel funnet.{" "}
                    <a href="/profil" className="underline hover:text-amber-800">Legg til i profilen</a>
                  </p>
                )}
              </div>
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
                      // v0.18.0: carry the scanned EAN through to the
                      // form initial so the barcode chip renders and
                      // /api/viner receives it on save. Falls back to
                      // an empty string when prefill was set without
                      // a scan (e.g. an OCR-only prefill).
                      ean: prefill.ean ?? "",
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
