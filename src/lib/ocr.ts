import Tesseract from "tesseract.js"

/**
 * Client-side OCR for wine labels. Uses tesseract.js v7 with English +
 * Norwegian Bokmål models. A singleton Web Worker is loaded on first
 * call (cold start: ~5-10s while WASM + `eng` + `nor` traineddata
 * download) and reused for subsequent calls; disposeLabelWorker() runs
 * it down on page unmount.
 *
 * The flow on /viner/ny: pick a photo -> OCR -> extracted text becomes
 * the search query for the existing wineapi.io /wines/search?q=...
 * endpoint. OCR itself needs no API key; the search step still needs
 * the saved wineapiKey.
 */

export type OcrProgress = {
  /** Tesseract-reported status: "loading tesseract core",
   *  "initializing tesseract", "loading language traineddata",
   *  "recognizing text", etc. */
  status: string
  /** 0..1 emit during WASM + lang-data boot then recognition. */
  progress: number
}

export type OcrResult = {
  /** Full raw OCR text, multi-line, unfiltered. */
  rawText: string
  /** Cleaned query string ready for wineapi.io /wines/search?q=. */
  query: string
  /** Lines that survived length + dedupe filtering. */
  lines: string[]
  /** Detected 4-digit vintage within ~next-2-year window, or null. */
  vintage: string | null
}

const LETTER = "a-zA-ZæøåÆØÅ"
const ALNUM = "a-zA-Z0-9æøåÆØÅ"
/// Capped at current+2 so stray 2099s in marginal photos don't slip.
/// Today (2026) the regex matches 1950..2028.
const VINTAGE_RE = /\b(19[5-9]\d|20[0-2]\d)\b/
/// Hard cap on the query string we send to wineapi.io. 80 chars fits
/// brand + region + vintage for any label we've seen.
const QUERY_MAX = 80
/// Drop OCR lines below this alphanumeric count. Filters noise like
/// "—", "©", "***" that survive trim() but contribute nothing to search.
const MIN_LINE_LEN = 3

let workerPromise: Promise<Tesseract.Worker> | null = null
/**
 * Module-scoped sink so the tesseract.js logger -- which is wired in
 * at createWorker time and immutable thereafter -- can route progress
 * to the freshest caller. The page disables the camera button while a
 * photo is in flight, so concurrent recognizeLabel calls are
 * unscheduled; if two happen anyway, the latest sink wins. Active
 * only inside the recognizeLabel try/finally.
 */
let activeSink: (event: OcrProgress) => void = () => {}

function telemetryLogger(msg: Tesseract.LoggerMessage): void {
  activeSink({
    status: msg.status,
    progress: Math.max(0, Math.min(1, msg.progress ?? 0)),
  })
}

async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("eng+nor", Tesseract.OEM.DEFAULT, {
      logger: telemetryLogger,
      /// We surface errors via recognizeLabel's try/catch instead of
      /// letting the worker's emit-error handler escalate unhandled.
      errorHandler: () => {},
    })
  }
  return workerPromise
}

/**
 * Terminate the singleton worker and forget it. Safe to call multiple
 * times. Page useEffect cleanup route on /viner/ny.
 */
export async function disposeLabelWorker(): Promise<void> {
  if (!workerPromise) return
  const w = await workerPromise
  await w.terminate()
  workerPromise = null
}

/**
 * Small-print keywords that mandatory EU/US back-label text uses and
 * that are useless for wineapi.io search. Dropping them before
 * scoring keeps 3-4 char brands like "Krug" or "Kiona" alive against
 * the longer "Contains sulphites" / "Imported by..." line. Matched
 * case-insensitively. Volume / strength markers are kept out so a
 * stray "13.5% vol" line doesn't crowd out the brand.
 */
const SMALL_PRINT_RE =
  /sulfit|sulphit|contains|contains\b|imported\s+by|bottled\s+by|produced\s+by|product\s+of|alc\.?\s*\d|%?\s*vol\.?\s*\d|\b\d+\s*ml\b|\b\d+\s*cl\b|\b\d+\s*l\b/i
function dedupeAdjacent(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const normalized = line.replace(/\s+/g, "").toLowerCase()
    if (normalized.length === 0) continue
    const prev = out[out.length - 1]
    if (prev) {
      const prevNormalized = prev.replace(/\s+/g, "").toLowerCase()
      const shorter =
        normalized.length < prevNormalized.length ? normalized : prevNormalized
      const longer =
        normalized.length < prevNormalized.length ? prevNormalized : normalized
      if (shorter.length > 1 && longer.includes(shorter)) continue
    }
    out.push(line)
  }
  return out
}

/**
 * Convert raw OCR text into a search query suitable for
 * wineapi.io /wines/search?q=... Strategy: keep lines that contain
 * both letters and at least MIN_LINE_LEN alphanumeric chars; dedupe
 * adjacent substring doubles; for the top 4 surviving lines, take the
 * first (often the brand at the top of the label) and the longest
 * (large stylized brand names span more horizontal pixels than the
 * mandatory small-print story text below); append any 4-digit vintage
 * last so the search API can use it as a precise filter.
 */
export function buildSearchQuery(rawText: string): OcrResult {
  const splitLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const allowedAlnum = new RegExp(`[${ALNUM}]`)
  const allowedLetter = new RegExp(`[${LETTER}]`)
  const alnumCounter = new RegExp(`[${ALNUM}]`, "g")
  const useful = splitLines.filter((line) => {
    if (SMALL_PRINT_RE.test(line)) return false
    const count = (line.match(alnumCounter) ?? []).length
    return count >= MIN_LINE_LEN && allowedLetter.test(line)
  })

  const deduped = dedupeAdjacent(useful)
  const vintage = rawText.match(VINTAGE_RE)?.[1] ?? null

  const firstHalf = deduped.slice(0, 4)
  const first = firstHalf[0] ?? ""
  const longest = firstHalf.reduce<string>(
    (acc, line) => (line.length > acc.length ? line : acc),
    "",
  )

  const parts: string[] = []
  if (first && first !== longest) parts.push(first)
  if (longest) parts.push(longest)
  if (vintage) parts.push(vintage)

  const query = parts.join(" ").slice(0, QUERY_MAX).replace(/\s+/g, " ").trim()

  return { rawText, query, lines: deduped, vintage }
}

/**
 * OCR a Blob and return a search-query-ready OcrResult. Call onProgress
 * for live UI feedback during WASM/lang load + recognition. Wire in
 * the consumer's loading + status states via the callback. Throws on
 * catastrophic worker failure (CDN unreachable, OOM, etc.).
 */
export async function recognizeLabel(
  blob: Blob,
  onProgress?: (event: OcrProgress) => void,
): Promise<OcrResult> {
  const worker = await getWorker()
  activeSink = onProgress ?? (() => {})
  try {
    const { data } = await worker.recognize(blob)
    return buildSearchQuery(data.text ?? "")
  } finally {
    activeSink = () => {}
  }
}
