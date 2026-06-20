export const wineTypes = [
  { key: "red", label: "Rødvin" },
  { key: "white", label: "Hvitvin" },
  { key: "sparkling", label: "Mousserende" },
  { key: "rose", label: "Rosé" },
  { key: "dessert", label: "Dessertvin" },
] as const

export const beerTypes = [
  { key: "beer_dark", label: "Mørkt øl" },
  { key: "beer_light", label: "Lyst øl" },
  { key: "beer_pilsner", label: "Pilsner" },
  { key: "beer_wheat", label: "Hveteøl" },
  { key: "beer_special", label: "Spesialøl" },
] as const

export type WineTypeKey = (typeof wineTypes)[number]["key"]
export type BeerTypeKey = (typeof beerTypes)[number]["key"]
export type TypeKey = WineTypeKey | BeerTypeKey | ""

const typeLabels: Record<string, string> = {}
for (const t of wineTypes) typeLabels[t.key] = t.label
for (const t of beerTypes) typeLabels[t.key] = t.label

export function typeLabel(type: string) {
  return typeLabels[type] ?? type
}

export function isBeerType(type: string) {
  return beerTypes.some((t) => t.key === type)
}

const wineFilterKeys = ["", "red", "white", "sparkling", "rose", "dessert"]
const allFilterKeys = ["", ...wineFilterKeys.slice(1), ...beerTypes.map((t) => t.key)]

export function getFilterKeys(isBeer: boolean) {
  return isBeer ? allFilterKeys : wineFilterKeys
}

const filterLabels: Record<string, string> = {
  "": "Alle",
  red: "Rød",
  white: "Hvit",
  sparkling: "Bobler",
  rose: "Rosé",
  dessert: "Dessert",
  beer_dark: "Mørk",
  beer_light: "Lys",
  beer_pilsner: "Pils",
  beer_wheat: "Hvete",
  beer_special: "Spesial",
}

export function filterLabel(key: string) {
  return filterLabels[key] ?? key
}
