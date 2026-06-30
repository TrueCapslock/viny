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

  const data = await res.json()
  return (data ?? []).map((item: WineapiSearchResult) => ({
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
