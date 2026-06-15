const BASE_URL = "https://apis.vinmonopolet.no/products/v0"

export type VinmonopoletProduct = {
  productId: string
  productShortName: string
}

type ApiResponseItem = {
  basic: {
    productId: string
    productShortName: string
  }
  lastChanged: {
    date: string
    time: string
  }
}

export class VinmonopoletError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

function getHeaders() {
  const key = process.env.VINMONOPOLET_API_KEY
  if (!key) {
    throw new VinmonopoletError("VINMONOPOLET_API_KEY is not set", 401)
  }
  return { "Ocp-Apim-Subscription-Key": key }
}

export async function searchProducts(query: string, maxResults = 10): Promise<VinmonopoletProduct[]> {
  const url = new URL(`${BASE_URL}/details-normal`)
  url.searchParams.set("productShortNameContains", query)
  url.searchParams.set("maxResults", String(maxResults))

  const res = await fetch(url.toString(), { headers: getHeaders() })

  if (!res.ok) {
    throw new VinmonopoletError(
      `Vinmonopolet API error: ${res.statusText}`,
      res.status,
    )
  }

  const data: ApiResponseItem[] = await res.json()
  return (data ?? []).map((item) => ({
    productId: item.basic.productId,
    productShortName: item.basic.productShortName,
  }))
}

export function productUrl(productId: string): string {
  return `https://www.vinmonopolet.no/p/${productId}`
}
