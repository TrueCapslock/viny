const BASE_URL = "https://www.wineapi.io/api/v1"

export type WineapiSearchResult = {
  id: number
  name: string
  vintage: number | null
  type: string | null
  winery: string | null
  region: string | null
  country: string | null
  averageRating: number | null
}

export type WineapiDetail = WineapiSearchResult & {
  grapes: string[]
  body: number | null
  acidity: number | null
  alcohol: number | null
  foodPairings: string[]
  prices: { currency: string; amount: number; store: string }[]
  criticScores: { critic: string; score: number }[]
  description: string | null
}

export class WineapiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

const ENVELOPE_KEYS = [
  "wines",
  "results",
  "data",
  "hits",
  "items",
  "payload",
  "records",
  "result",
] as const

/**
 * Find an array of wines in an unknown JSON value, checking common
 * envelope keys (`wines`, `results`, `data`, `hits`, `items`, `payload`,
 * `records`, `result`) at the current level and one level deep. Returns
 * the first matching array, or null.
 */
function findWinesArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    for (const key of ENVELOPE_KEYS) {
      const candidate = (data as Record<string, unknown>)[key]
      if (Array.isArray(candidate)) return candidate
    }
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        for (const key of ENVELOPE_KEYS) {
          const candidate = (value as Record<string, unknown>)[key]
          if (Array.isArray(candidate)) return candidate
        }
      }
    }
  }
  return null
}

/**
 * Extract a results array from a wineapi.io response, handling bare
 * arrays, common envelope keys (see `findWinesArray`) at the top level
 * and one level deep. Returns [] if no array can be located, so the
 * caller renders an empty results state instead of crashing with a
 * TypeError. Logs a warning with the actual top-level keys and a
 * truncated body preview on mismatch so a future API shape change is
 * diagnosable from the dev server logs.
 */
function pickResults(data: unknown, rawBody: string): WineapiSearchResult[] {
  const array = findWinesArray(data)
  if (array) return array as WineapiSearchResult[]
  console.warn(
    "[wineapi/search] unrecognized response shape; expected bare array or envelope with one of: " +
      ENVELOPE_KEYS.join(", "),
    {
      topLevelType: Array.isArray(data) ? "array" : typeof data,
      topLevelKeys:
        data && typeof data === "object"
          ? Object.keys(data as Record<string, unknown>)
          : null,
      bodyPreview: rawBody.slice(0, 800),
    },
  )
  return []
}

export async function searchWines(
  apiKey: string,
  query: string,
  maxResults = 10,
): Promise<WineapiSearchResult[]> {
  const url = new URL(`${BASE_URL}/wines/search`)
  url.searchParams.set("q", query)
  url.searchParams.set("limit", String(maxResults))

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  })

  if (!res.ok) {
    throw new WineapiError(
      `wineapi.io error: ${res.statusText}`,
      res.status,
    )
  }

  // Read the body as text first so we can both parse it AND log a preview
  // on parse failure or unrecognized shape.
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (parseError) {
    console.error(
      "[wineapi/search] failed to parse JSON response from wineapi.io",
      {
        status: res.status,
        contentType: res.headers.get("content-type"),
        bodyPreview: text.slice(0, 500),
      },
    )
    throw new WineapiError(
      `Invalid JSON from wineapi.io: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      502,
    )
  }
  return pickResults(data, text).map((item: WineapiSearchResult) => ({
    id: item.id,
    name: item.name,
    vintage: item.vintage ?? null,
    type: item.type ?? null,
    winery: item.winery ?? null,
    region: item.region ?? null,
    country: item.country ?? null,
    averageRating: item.averageRating ?? null,
  }))
}

export async function getWineDetail(
  apiKey: string,
  wineId: number,
): Promise<WineapiDetail | null> {
  const res = await fetch(`${BASE_URL}/wines/${wineId}`, {
    headers: { "x-api-key": apiKey },
  })

  if (!res.ok) {
    if (res.status === 404) return null
    throw new WineapiError(
      `wineapi.io error: ${res.statusText}`,
      res.status,
    )
  }

  const item = await res.json()
  return {
    id: item.id,
    name: item.name,
    vintage: item.vintage ?? null,
    type: item.type ?? null,
    winery: item.winery ?? null,
    region: item.region ?? null,
    country: item.country ?? null,
    averageRating: item.averageRating ?? null,
    grapes: item.grapes ?? [],
    body: item.body ?? null,
    acidity: item.acidity ?? null,
    alcohol: item.alcohol ?? null,
    foodPairings: item.foodPairings ?? [],
    prices: item.prices ?? [],
    criticScores: item.criticScores ?? [],
    description: item.description ?? null,
  }
}
