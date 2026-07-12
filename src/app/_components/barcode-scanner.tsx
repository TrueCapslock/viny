"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Barcode scanner for EAN-13 / EAN-8 / UPC-A / UPC-E codes. Two
 * paths, picked at runtime:
 *
 *   1. Native `window.BarcodeDetector` -- Chrome 83+ on Android, Edge,
 *      Safari iOS 17+ (iPadOS 17+). Zero bundle cost, ~30 fps.
 *   2. `@zxing/browser`'s BrowserMultiFormatReader -- Safari iOS ≤16,
 *      older browsers, environments where BarcodeDetector is gated.
 *      Imported lazily so only paid users pay the ~70 KB.
 *
 * Output: onDetected(ean: string, format: string) fires exactly once
 * per EAN read. We self-cancel after the first hit so the camera
 * stream is stopped before the parent route navigates / re-renders.
 *
 * Permission: getUserMedia triggers the browser's permission prompt
 * synchronously -- if denied we surface "Vi trenger tilgang til
 * kameraet" and fall through to the manual-entry box.
 *
 * Manual entry: a numeric input is always available as a fallback,
 * not just on failure -- some users will prefer to type the EAN
 * they see on a photo of the label. Enabled in every state.
 */

declare global {
  interface Window {
    BarcodeDetector?: new (init: { formats: string[] }) => {
      detect(source: CanvasImageSource): Promise<
        Array<{ rawValue: string; format: string }>
      >
    }
  }
}

const EAN_FORMAT = ["ean_13", "ean_8", "upc_a", "upc_e"] as const

type ScannerStatus =
  | "idle"
  | "requesting-permission"
  | "scanning"
  | "found"
  | "denied"
  | "unsupported"
  | "error"

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (ean: string, format: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<NonNullable<Window["BarcodeDetector"]>> | null>(null)
  const zxingReaderRef = useRef<{ reset?: () => void } | null>(null)
  // Set the moment we read a barcode so subsequent rAF/setTimeout
  // ticks in the native loop bail out before firing a duplicate.
  const consumedRef = useRef(false)

  const [status, setStatus] = useState<ScannerStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [manualEan, setManualEan] = useState("")

  useEffect(() => {
    let cancelled = false

    function teardown() {
      try {
        zxingReaderRef.current?.reset?.()
      } catch {
        // ignore -- zxing throws if it's already torn down
      }
      zxingReaderRef.current = null
      detectorRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop()
          } catch {
            // ignore
          }
        })
        streamRef.current = null
      }
      const v = videoRef.current
      if (v) {
        v.pause()
        v.srcObject = null
      }
    }

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setStatus("unsupported")
        setErrorMsg("Nettleseren støtter ikke kameratilgang")
        return
      }

      setStatus("requesting-permission")
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        })
      } catch (e) {
        if (cancelled) return
        const err = e as DOMException
        if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
          setStatus("denied")
        } else if (
          err?.name === "NotFoundError" ||
          err?.name === "OverconstrainedError" ||
          err?.name === "NotReadableError"
        ) {
          setErrorMsg("Fant ikke noe kamera")
          setStatus("error")
        } else {
          setErrorMsg(err?.message ?? "Kamerafeil")
          setStatus("error")
        }
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setErrorMsg("Video-element ikke klar")
        setStatus("error")
        return
      }
      video.srcObject = stream
      // We always want muted -- autoplay may reject otherwise on iOS.
      video.muted = true
      try {
        await video.play()
      } catch {
        // iOS will sometimes refuse autoplay; the element is still
        // queryable by the detector / ZXing loop and will start
        // producing frames on the next user interaction.
      }
      if (cancelled) {
        teardown()
        return
      }

      const Ctor =
        typeof window !== "undefined" ? window.BarcodeDetector : undefined
      if (Ctor) {
        try {
          detectorRef.current = new Ctor({ formats: [...EAN_FORMAT] })
        } catch {
          detectorRef.current = null
        }
      }

      if (detectorRef.current) {
        runNativeLoop()
      } else {
        await runZxingPath(video)
      }
    }

    async function runNativeLoop() {
      if (cancelled) return
      setStatus("scanning")
      const tick = async () => {
        if (cancelled || consumedRef.current) return
        const v = videoRef.current
        const det = detectorRef.current
        if (!v || !det) return
        // Need currentTime > 0 to have frames; skip the first few ticks.
        if (v.readyState >= 2 && v.currentTime > 0) {
          try {
            const codes = await det.detect(v)
            if (codes && codes.length > 0) {
              handleDetection(codes[0].rawValue, codes[0].format)
              return
            }
          } catch {
            // detect() throws intermittently on old Chrome builds when
            // the video is re-bound; safe to swallow and retry next tick.
          }
        }
        if (!cancelled) setTimeout(tick, 250)
      }
      tick()
    }

    async function runZxingPath(video: HTMLVideoElement) {
      try {
        const mod = await import("@zxing/browser")
        if (cancelled) return
        const reader = new mod.BrowserMultiFormatReader()
        zxingReaderRef.current = reader as unknown as {
          reset?: () => void
        }
        setStatus("scanning")
        // decodeFromVideoElement drives its own rAF loop and fires the
        // callback continuously; we short-circuit after the first hit.
        reader.decodeFromVideoElement(video, (result, err) => {
          if (cancelled || consumedRef.current) return
          if (result) {
            const fmt =
              typeof result.getBarcodeFormat === "function"
                ? String(result.getBarcodeFormat())
                : "ean"
            handleDetection(result.getText(), fmt)
            return
          }
          // NotFoundException = "no barcode in this frame"; expected,
          // keep looping. Anything else we surface.
          if (
            err &&
            err.name &&
            err.name !== "NotFoundException" &&
            err.name !== "NotFoundException2" &&
            err.name !== "ChecksumException"
          ) {
            // soft-fail; zxing sometimes throws spurious exceptions
            // mid-frame. Don't push the user into an error state here.
          }
        })
      } catch (e) {
        if (cancelled) return
        // Dynamic import failure -> barcodescanner.js Wasm missing,
        // or browser refused. Tell the user and open the manual box.
        setErrorMsg(
          "Kunne ikke starte skanneren: " +
            (e instanceof Error ? e.message : String(e)),
        )
        setStatus("error")
      }
    }

    function handleDetection(rawValue: string, format: string) {
      if (consumedRef.current) return
      const ean = String(rawValue ?? "").replace(/\D/g, "")
      // EAN-13 / UPC-A -> 12-13 digits. EAN-8 -> 7-8. Buffer 14 for
      // GS1 composite symbology extras. Reject anything else so a
      // stray QR / data-matrix read doesn't fire onDetected.
      if (ean.length < 7 || ean.length > 14) return
      consumedRef.current = true
      setStatus("found")
      teardown()
      onDetected(ean, format)
    }

    start()

    return () => {
      cancelled = true
      teardown()
    }
  }, [onDetected])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const ean = manualEan.replace(/\D/g, "")
    if (ean.length < 7 || ean.length > 14) return
    if (consumedRef.current) return
    consumedRef.current = true
    onDetected(ean, "manual")
  }

  return (
    <div className="space-y-3 rounded-2xl border border-wine-200 bg-gradient-to-b from-wine-50 to-white p-4">
      <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          aria-label="Kamera for strekkode-skanning"
        />
        {/* Scan reticle. Centered ~62% line, animated line; guides the
            user to align the barcode horizontally across the centre.
            No target tracking -- ZXing and BarcodeDetector run on
            every frame, so the user just keeps the EAN inside the
            box. */}
        <div className="pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2">
          <div className="relative h-20 border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-wine-300 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-wine-300 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-wine-300 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-wine-300 rounded-br" />
            <div
              className={`absolute inset-x-2 h-0.5 bg-wine-300 rounded-full ${
                status === "scanning" ? "animate-[scanline_1.6s_ease-in-out_infinite]" : ""
              }`}
              style={{ top: "50%" }}
            />
          </div>
        </div>
        {status === "found" && (
          <div className="absolute inset-0 flex items-center justify-center bg-wine-700/85 text-white font-medium text-base animate-fade-in">
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Fant strekkode
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-wine-700">
          {status === "idle" && "Klar til å skanne…"}
          {status === "requesting-permission" &&
            "Ber om kameratilgang… Godta spørsmålet fra nettleseren."}
          {status === "scanning" &&
            "Hold strekkoden foran kameraet, ca. 10–20 cm unna. Innenfor rammen."}
          {status === "found" && "Strekkode lest — finner produktinfo …"}
          {status === "denied" && (
            <>
              Vi trenger tilgang til kameraet for å skanne strekkoder. Du
              kan endre tillatelsen i nettleserens innstillinger, eller
              skrive inn EAN under.
            </>
          )}
          {status === "unsupported" && (errorMsg ?? "Nettleseren støtter ikke skanner.")}
          {status === "error" && (errorMsg ?? "Noe gikk galt.")}
        </p>

        <form onSubmit={submitManual} className="flex items-center gap-2">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={manualEan}
            onChange={(e) => setManualEan(e.target.value)}
            className="flex-1 rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            aria-label="Manuelt EAN-nummer"
          />
          <button
            type="submit"
            className="rounded-lg bg-wine-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-wine-700 transition-colors disabled:opacity-50"
            disabled={
              manualEan.replace(/\D/g, "").length < 7 ||
              manualEan.replace(/\D/g, "").length > 14
            }
          >
            Bruk
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-wine-200 text-wine-700 px-3 py-1.5 text-xs font-medium hover:bg-wine-50 transition-colors"
          >
            Lukk
          </button>
        </form>
      </div>
    </div>
  )
}
