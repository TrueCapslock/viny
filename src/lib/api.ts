export async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export function apiUrl(path: string, params?: Record<string, string | number | undefined | null>) {
  const url = new URL(path, "http://localhost")
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val != null && val !== "") url.searchParams.set(key, String(val))
    }
  }
  return url.pathname + url.search
}
