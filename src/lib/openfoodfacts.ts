/**
 * Open Food Facts client -- EAN -> product metadata.
 *
 * Server-only. Used by /api/barcode/lookup as the first leg of a
 * two-stage lookup: OFF gives us free, public name/brand/country/image,
 * wineapi.io (the second leg) tries to enrich with a structured wine
 * record if the user has a saved wineapiKey.
 *
 * OFF coverage of Norwegian / Vinmonopolet wines is patchy (manual
 * crowd-sourcing, see https://world.openfoodfacts.org). When OFF has
 * nothing, the route still returns a 200 with off=null so the client can
 * surface "EAN lest, ingen treff" and let the user fill in by hand.
 *
 * Endpoint: GET https://world.openfoodfacts.org/api/v2/product/{ean}.json
 *   Status:  1 found / 0 not found; we only consider status = 1.
 *   Returns 200 with status:0 on miss -- not a 404! Handle both.
 * Auth:  none, but they require a User-Agent identifying the consumer
 *   ("Generic Uva barcode lookup" is fine; let's keep it descriptive).
 */

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product"
// ATTRIBUTION requirement of OpenFoodFacts: any product of the OpenFoodFacts
// database is available under the Open Database License. The terms of the
// ODbL require us to attribute "Open Food Facts" -- the client UI surfaces
// this with an inline "(kilde: openfoodfacts.org)" caption next to any
// product name returned by this module.
const OFF_ATTRIBUTION = "Kilde: openfoodfacts.org"
const USER_AGENT =
  "Uva/0.18 (https://uba-app.example; kontakt: dev@uba-app.example)"

// Drinks-shape filter -- tags that mean OFF's product is something the
// user would knowingly scan as a wine/beer/cider. Covers the canonical
// en:* taxonomy plus the loose Norwegian/localised aliases OFF returns
// for some records. We accept an OFF row whose categories includes any
// of these (or anything starting with one of them, e.g. "en:red-wines").
const DRINK_TAGS = [
  "en:wines",
  "en:sparkling-wines",
  "en:dessert-wines",
  "en:fortified-wines",
  "en:aromatized-wines",
  "en:beers",
  "en:ciders",
  "en:alcoholic-beverages",
  "en:meads",
]

export type OffProduct = {
  ean: string
  /** OFF product_name (or product_name_en fallback). Null if OFF has none. */
  name: string | null
  /** First comma-separated BRANDS token, trimmed (OFF sometimes lists many). */
  brand: string | null
  /** First comma-separated COUNTRIES token, trimmed. */
  country: string | null
  /** Front image URL (or image_url fallback). */
  image: string | null
  /** Categories array (en:* tags). Unused by the route but exposed for the client. */
  categories: string[]
  /** True if the product is wine / beer / cider / alcoholic-beverages-shaped. */
  looksLikeDrink: boolean
  /** Attribution caption per OFF licence. Always returned so the UI can display it. */
  attribution: string
}

function looksLikeDrink(
  categoriesTags: unknown,
  rawCategories: unknown,
): boolean {
  if (Array.isArray(categoriesTags)) {
    for (const raw of categoriesTags) {
      if (typeof raw !== "string") continue
      const tag = raw.toLowerCase()
      for (const d of DRINK_TAGS) {
        // Categories tags often have nested suffixes (en:red-wines,
        // en:sparkling-wines-fr, ...) -- startsWith covers all of them.
        if (tag === d || tag.startsWith(d + "-")) return true
      }
    }
  }
  // Fallback to the raw human-readable categories string -- OFF has
  // ~30 % of records that only carry a plain-text category in
  // product.categories ("Vin rouge", "Beer", etc.).
  if (typeof rawCategories === "string") {
    if (/\b(\u00f8l|\u00d8l|beer|vin|vino|wein|cidre|cider|wijn|wine)\b/i.test(rawCategories)) {
      return true
    }
  }
  return false
}

function firstToken(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  // Brands is "Foo, Bar, Baz" -- take the first non-empty comma-split.
  return trimmed.split(",").map((s) => s.trim()).find((s) => s.length > 0) ?? null
}

/**
 * Look up an EAN on Open Food Facts.
 * Returns null on miss (OFF status:0) and on any error; never throws.
 * A 5s timeout protects the route against a slow OFF.
 */
export async function lookupOffEan(ean: string): Promise<OffProduct | null> {
  const url = `${OFF_BASE}/${encodeURIComponent(ean)}.json`
  const controller = new AbortController()
  const timeoutMs = 5000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) return null
    const data: unknown = await res.json().catch(() => null)
    // OFF returns { status: 1, status_verbose: "product found", product: { ... } }
    //           or { status: 0, status_verbose: "product not found" }
    // -- 200 in both cases. We only honour status === 1.
    if (!data || typeof data !== "object") return null
    const top = data as { status?: unknown; product?: unknown }
    if (top.status !== 1 || !top.product || typeof top.product !== "object") {
      return null
    }
    const p = top.product as Record<string, unknown>
    const nameRaw =
      (typeof p.product_name === "string" && p.product_name) ||
      (typeof p.product_name_en === "string" && p.product_name_en) ||
      (typeof p.generic_name === "string" && p.generic_name) ||
      null
    const imageRaw =
      (typeof p.image_front_url === "string" && p.image_front_url) ||
      (typeof p.image_url === "string" && p.image_url) ||
      null
    return {
      ean,
      name: typeof nameRaw === "string" && nameRaw.trim().length > 0
        ? nameRaw.trim().slice(0, 200)
        : null,
      brand: firstToken(p.brands),
      country: firstToken(p.countries),
      image: typeof imageRaw === "string" && imageRaw.length > 0 ? imageRaw.slice(0, 500) : null,
      categories: Array.isArray(p.categories_tags)
        ? (p.categories_tags.filter((t): t is string => typeof t === "string"))
        : [],
      looksLikeDrink: looksLikeDrink(p.categories_tags, p.categories),
      attribution: OFF_ATTRIBUTION,
    }
  } catch (e) {
    // AbortError is the timeout firing -- log but don't elevate.
    const name = (e as { name?: unknown } | null)?.name
    if (name === "AbortError") {
      console.warn("[openfoodfacts] timeout", { ean, timeoutMs })
    } else if (e instanceof Error) {
      console.warn("[openfoodfacts] error", { ean, message: e.message })
    } else {
      console.warn("[openfoodfacts] error", { ean })
    }
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export { OFF_ATTRIBUTION }
