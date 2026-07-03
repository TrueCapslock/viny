// Country → flag emoji mapping. Covers the most common wine-producing
// countries in both English and Norwegian (this app is Norwegian-first).
// Shared by the wine-page detail identity chips and the WineCard chips so
// the flag rendering stays consistent across the app.
export const COUNTRY_FLAGS: Record<string, string> = {
  France: "🇫🇷",
  Frankrike: "🇫🇷",
  Italy: "🇮🇹",
  Italia: "🇮🇹",
  Spain: "🇪🇸",
  Spania: "🇪🇸",
  Portugal: "🇵🇹",
  "United States": "🇺🇸",
  USA: "🇺🇸",
  Argentina: "🇦🇷",
  Chile: "🇨🇱",
  Australia: "🇦🇺",
  "South Africa": "🇿🇦",
  "Sør-Afrika": "🇿🇦",
  SørAfrika: "🇿🇦",
  Germany: "🇩🇪",
  Tyskland: "🇩🇪",
  Austria: "🇦🇹",
  Østerrike: "🇦🇹",
  "New Zealand": "🇳🇿",
  Greece: "🇬🇷",
  Hellas: "🇬🇷",
  Hungary: "🇭🇺",
  Georgia: "🇬🇪",
  Lebanon: "🇱🇧",
  Libanon: "🇱🇧",
  Brazil: "🇧🇷",
  Brasil: "🇧🇷",
  Mexico: "🇲🇽",
  Canada: "🇨🇦",
  Japan: "🇯🇵",
  India: "🇮🇳",
  Moldova: "🇲🇩",
  "North Macedonia": "🇲🇰",
  Slovenia: "🇸🇮",
  Croatia: "🇭🇷",
  Kroatia: "🇭🇷",
  Switzerland: "🇨🇭",
  Sveits: "🇨🇭",
  Belgium: "🇧🇪",
  Belgia: "🇧🇪",
  Netherlands: "🇳🇱",
  Nederland: "🇳🇱",
  "United Kingdom": "🇬🇧",
  UK: "🇬🇧",
  Romania: "🇷🇴",
  Bulgaria: "🇧🇬",
  Uruguay: "🇺🇾",
}

export function countryFlag(name: string | null | undefined): string {
  if (!name) return ""
  const trimmed = name.trim()
  return COUNTRY_FLAGS[trimmed] ?? COUNTRY_FLAGS[trimmed.toLowerCase()] ?? ""
}
