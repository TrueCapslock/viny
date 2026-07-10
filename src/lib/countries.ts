/**
 * Country → flag-emoji lookup for Viny.
 *
 * Wines store `country` as a free-text string, mainly in Norwegian
 * (e.g. "Frankrike"), but the wineapi.io search results in
 * `src/app/viner/ny/page.tsx` come back in English ("France"). The
 * lookup in `countryFlag()` and `countryEntry()` is case-insensitive
 * and accepts any of the aliases for a country — Norwegian, English,
 * the native spelling, and the ISO 3166-1 alpha-2 code itself — so
 * seeded wineapi hits map to a flag the same way user-typed
 * Norwegian values do.
 *
 * Adding a new country: append a `Country` entry below with its
 * Norwegian label, ISO alpha-2, emoji, and any aliases you want
 * supported. The lookup tables are derived from this single list at
 * module load.
 */

export type Country = {
  /** Norwegian Bokmål label (authoritative — what we render in the UI). */
  no: string
  /** ISO 3166-1 alpha-2 code (uppercase). */
  iso2: string
  /** Flag emoji (regional-indicator pair, e.g. 🇫🇷). */
  emoji: string
  /**
   * All strings this country should match on, lowercased before
   * insertion into the lookup table. Include English/native names so
   * wineapi.io results map without translation.
   */
  aliases: string[]
}

export const COUNTRIES: readonly Country[] = [
  // The 32 countries called out in GitHub issue #1, plus Norge since
  // Viny's seeded test wine is brand-less / Norwegian-anchored and
  // local users may have domestic wines.
  { no: "Norge", iso2: "NO", emoji: "🇳🇴", aliases: ["Norge", "Noreg", "Norway"] },
  { no: "Italia", iso2: "IT", emoji: "🇮🇹", aliases: ["Italia", "Italy"] },
  { no: "Frankrike", iso2: "FR", emoji: "🇫🇷", aliases: ["Frankrike", "France", "Frankreich"] },
  { no: "Spania", iso2: "ES", emoji: "🇪🇸", aliases: ["Spania", "Spain", "Espana", "España"] },
  { no: "USA", iso2: "US", emoji: "🇺🇸", aliases: ["USA", "Usa", "United States", "America", "U.S.A", "U.S."] },
  { no: "Australia", iso2: "AU", emoji: "🇦🇺", aliases: ["Australia"] },
  { no: "Argentina", iso2: "AR", emoji: "🇦🇷", aliases: ["Argentina"] },
  { no: "Sør-Afrika", iso2: "ZA", emoji: "🇿🇦", aliases: ["Sør-Afrika", "Sor-Afrika", "Sørafrika", "South Africa"] },
  { no: "Chile", iso2: "CL", emoji: "🇨🇱", aliases: ["Chile"] },
  { no: "Tyskland", iso2: "DE", emoji: "🇩🇪", aliases: ["Tyskland", "Germany", "Deutschland"] },
  { no: "Portugal", iso2: "PT", emoji: "🇵🇹", aliases: ["Portugal"] },
  { no: "Russland", iso2: "RU", emoji: "🇷🇺", aliases: ["Russland", "Russia"] },
  { no: "Romania", iso2: "RO", emoji: "🇷🇴", aliases: ["Romania", "Romania"] },
  { no: "New Zealand", iso2: "NZ", emoji: "🇳🇿", aliases: ["New Zealand", "New-Zealand", "Newzealand", "NZ"] },
  { no: "Brasil", iso2: "BR", emoji: "🇧🇷", aliases: ["Brasil", "Brazil"] },
  { no: "Ungarn", iso2: "HU", emoji: "🇭🇺", aliases: ["Ungarn", "Hungary", "Magyarorszag"] },
  { no: "Østerrike", iso2: "AT", emoji: "🇦🇹", aliases: ["Østerrike", "Osterrike", "Austria", "Österreich"] },
  { no: "Georgia", iso2: "GE", emoji: "🇬🇪", aliases: ["Georgia", "Sakartvelo"] },
  { no: "Hellas", iso2: "GR", emoji: "🇬🇷", aliases: ["Hellas", "Greece"] },
  { no: "Moldova", iso2: "MD", emoji: "🇲🇩", aliases: ["Moldova"] },
  { no: "Sveits", iso2: "CH", emoji: "🇨🇭", aliases: ["Sveits", "Switzerland", "Schweiz", "Suisse", "Svizzera"] },
  { no: "Slovenia", iso2: "SI", emoji: "🇸🇮", aliases: ["Slovenia", "Slovenija"] },
  { no: "Uruguay", iso2: "UY", emoji: "🇺🇾", aliases: ["Uruguay"] },
  { no: "Bulgaria", iso2: "BG", emoji: "🇧🇬", aliases: ["Bulgaria"] },
  { no: "Kroatia", iso2: "HR", emoji: "🇭🇷", aliases: ["Kroatia", "Croatia", "Hrvatska"] },
  { no: "Tsjekkia", iso2: "CZ", emoji: "🇨🇿", aliases: ["Tsjekkia", "Czechia", "Czech Republic", "Cesko"] },
  { no: "Serbia", iso2: "RS", emoji: "🇷🇸", aliases: ["Serbia", "Srbija"] },
  { no: "Mexico", iso2: "MX", emoji: "🇲🇽", aliases: ["Mexico"] },
  { no: "Slovakia", iso2: "SK", emoji: "🇸🇰", aliases: ["Slovakia", "Slovensko"] },
  { no: "Luxembourg", iso2: "LU", emoji: "🇱🇺", aliases: ["Luxembourg", "Letzebuerg"] },
  { no: "Kypros", iso2: "CY", emoji: "🇨🇾", aliases: ["Kypros", "Cyprus", "Kibris"] },
  { no: "Kina", iso2: "CN", emoji: "🇨🇳", aliases: ["Kina", "China", "Zhongguo"] },
  { no: "Japan", iso2: "JP", emoji: "🇯🇵", aliases: ["Japan", "Nippon"] },
  { no: "Armenia", iso2: "AM", emoji: "🇦🇲", aliases: ["Armenia", "Hayastan"] },
]

// Build lookup tables once. `aliases` are pre-lowercased so we don't
// allocate / toLowerCase() on every render — country names are
// rendered inline and called frequently on wine list pages. We also
// index the Norwegian label and the ISO 3166-1 alpha-2 code so
// direct lookups like `countryEntry("FR")` resolve without rebuilding
// the user's caller-side alias map.
const BY_ALIAS: Map<string, Country> = new Map()
for (const c of COUNTRIES) {
  for (const a of c.aliases) {
    BY_ALIAS.set(a.toLowerCase(), c)
  }
  if (!BY_ALIAS.has(c.no.toLowerCase())) {
    BY_ALIAS.set(c.no.toLowerCase(), c)
  }
  if (!BY_ALIAS.has(c.iso2.toLowerCase())) {
    BY_ALIAS.set(c.iso2.toLowerCase(), c)
  }
}

/**
 * Look up a flag emoji for a country string. Returns `null` when the
 * string is empty, undefined, or doesn't match any known country —
 * callers render `null` as "no flag", leaving the country text alone.
 */
export function countryFlag(country: string | null | undefined): string | null {
  return countryEntry(country)?.emoji ?? null
}

/**
 * Look up the full `Country` entry (Norwegian label, ISO2, emoji)
 * for a country string. Returns `null` for unknown values.
 */
export function countryEntry(
  country: string | null | undefined,
): Country | null {
  if (!country) return null
  return BY_ALIAS.get(country.trim().toLowerCase()) ?? null
}
