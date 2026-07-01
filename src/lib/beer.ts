export const wineTypes = [
  { key: "red", label: "Rødvin" },
  { key: "white", label: "Hvitvin" },
  { key: "sparkling", label: "Mousserende" },
  { key: "rose", label: "Rosé" },
  { key: "dessert", label: "Dessertvin" },
  { key: "beer", label: "Øl" },
] as const

// Comprehensive beer style list with display order: IPA -> Ale -> Lager
// -> Hvete -> Mørk -> Spesial. `group` is the optgroup label rendered in
// the wine form's type dropdown when in beer mode.
export const beerTypes = [
  // IPA & Pale Ale
  { key: "beer_ipa", label: "IPA", group: "IPA & Pale Ale" },
  { key: "beer_pale_ale", label: "Pale Ale", group: "IPA & Pale Ale" },
  // Ale
  { key: "beer_amber_ale", label: "Amber Ale", group: "Ale" },
  { key: "beer_brown_ale", label: "Brown Ale", group: "Ale" },
  { key: "beer_cream_ale", label: "Cream Ale", group: "Ale" },
  // Lager
  { key: "beer_pilsner", label: "Pilsner", group: "Lager" },
  { key: "beer_lager", label: "Lager", group: "Lager" },
  { key: "beer_helles", label: "Helles", group: "Lager" },
  { key: "beer_kolsch", label: "Kölsch", group: "Lager" },
  // Hvete
  { key: "beer_wheat", label: "Hveteøl", group: "Hvete" },
  { key: "beer_berliner_weisse", label: "Berliner Weisse", group: "Hvete" },
  { key: "beer_gose", label: "Gose", group: "Hvete" },
  // Mørk
  { key: "beer_bock", label: "Bock", group: "Mørk" },
  { key: "beer_dunkel", label: "Dunkel", group: "Mørk" },
  { key: "beer_schwarzbier", label: "Schwarzbier", group: "Mørk" },
  { key: "beer_stout", label: "Stout", group: "Mørk" },
  { key: "beer_porter", label: "Porter", group: "Mørk" },
  // Spesial
  { key: "beer_saison", label: "Saison", group: "Spesial" },
  { key: "beer_tripel", label: "Tripel", group: "Spesial" },
  { key: "beer_dubbel", label: "Dubbel", group: "Spesial" },
  { key: "beer_belgian_ale", label: "Belga ale", group: "Spesial" },
  { key: "beer_sour", label: "Surøl", group: "Spesial" },
  { key: "beer_barleywine", label: "Barleywine", group: "Spesial" },
] as const

// Display order of beer type groups in the form dropdown.
export const beerTypeGroups = [
  "IPA & Pale Ale",
  "Ale",
  "Lager",
  "Hvete",
  "Mørk",
  "Spesial",
] as const

export type WineTypeKey = (typeof wineTypes)[number]["key"]
export type BeerTypeKey = (typeof beerTypes)[number]["key"]
export type TypeKey = WineTypeKey | BeerTypeKey | ""

// Auto-build long-form labels table from the source-of-truth arrays above.
// Anything in the database that doesn't match falls back to the raw value.
const typeLabels: Record<string, string> = {}
for (const t of wineTypes) typeLabels[t.key] = t.label
for (const t of beerTypes) typeLabels[t.key] = t.label

// Back-compat fallback for the five legacy generic beer keys that were
// shipped in v0.6–v0.7. They were dropped from the source-of-truth
// `beerTypes` array when we expanded to 23 specific styles, but any
// pre-existing Wine rows that still reference these keys need to render
// a human-readable label instead of the raw enum string.
const legacyTypeLabels: Record<string, string> = {
  beer_dark: "Mørkt øl",
  beer_light: "Lyst øl",
  beer_pilsner: "Pilsner",
  beer_wheat: "Hveteøl",
  beer_special: "Spesialøl",
}

export function typeLabel(type: string) {
  return typeLabels[type] ?? legacyTypeLabels[type] ?? type
}

export function isBeerType(type: string) {
  // Match either the generic "Øl" entry OR any specific beer subtype.
  if (type === "beer") return true
  return beerTypes.some((t) => t.key === type)
}

const allBeerTypeKeys = beerTypes.map((t) => t.key)
// Wine-mode chip row keeps the generic "Øl" so users can still filter to
// entries tagged with the legacy "beer" key -- the keys themselves are
// different from the 23 sub-style keys below, so the entry is reachable.
const wineTypeKeysForWineMode = wineTypes.map((t) => t.key)
// Beer-mode chip row also surfaces the wine-specific types at the end so
// the user can still filter for entries they've tagged with a wine style.
// The generic "Øl" chip is intentionally excluded -- beer mode is for
// beer browsing, and the generic "Øl" key is not a sub-style.
const wineTypeKeysForBeerMode = wineTypes
  .filter((t) => t.key !== "beer")
  .map((t) => t.key)

// Filter chip row:
//   - wine mode: Alle + the 6 wine types (incl. generic Øl).
//   - beer mode: Alle + the 23 beer sub-styles first, then the 5 wine-
//     specific types appended at the end so users can still reach wine-
//     tagged entries from beer mode (e.g. a mis-tagged "red" chip).
export function getFilterKeys(isBeer: boolean) {
  if (isBeer) {
    return ["", ...allBeerTypeKeys, ...wineTypeKeysForBeerMode]
  }
  return ["", ...wineTypeKeysForWineMode]
}

// Short labels for the filter chip row — only the ones we have short
// labels for (the long beer styles fall back to their full label).
const filterLabels: Record<string, string> = {
  "": "Alle",
  red: "Rød",
  white: "Hvit",
  sparkling: "Bobler",
  rose: "Rosé",
  dessert: "Dessert",
  beer: "Øl",
  beer_ipa: "IPA",
  beer_pale_ale: "Pale",
  beer_amber_ale: "Amber",
  beer_brown_ale: "Brown",
  beer_cream_ale: "Cream",
  beer_pilsner: "Pils",
  beer_lager: "Lager",
  beer_helles: "Helles",
  beer_kolsch: "Kölsch",
  beer_wheat: "Hvete",
  beer_berliner_weisse: "Berliner",
  beer_gose: "Gose",
  beer_bock: "Bock",
  beer_dunkel: "Dunkel",
  beer_schwarzbier: "Schwarz",
  beer_stout: "Stout",
  beer_porter: "Porter",
  beer_saison: "Saison",
  beer_tripel: "Tripel",
  beer_dubbel: "Dubbel",
  beer_belgian_ale: "Belga",
  beer_sour: "Sur",
  beer_barleywine: "Barley",
}

export function filterLabel(key: string) {
  return filterLabels[key] ?? key
}
