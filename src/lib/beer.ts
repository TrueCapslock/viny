const typeMap: Record<string, [string, string]> = {
  red: ["Rødvin", "Mørkt øl"],
  white: ["Hvitvin", "Lyst øl"],
  sparkling: ["Mousserende", "Pilsner"],
  rose: ["Rosé", "Hveteøl"],
  dessert: ["Dessertvin", "Spesialøl"],
}

export function typeLabel(type: string, isBeer: boolean) {
  const pair = typeMap[type]
  if (!pair) return type
  return isBeer ? pair[1] : pair[0]
}

export const filterLabels: Record<string, [string, string]> = {
  "": ["Alle", "Alle"],
  red: ["Rød", "Mørk"],
  white: ["Hvit", "Lys"],
  sparkling: ["Bobler", "Pils"],
  rose: ["Rosé", "Hvete"],
  dessert: ["Dessert", "Spesial"],
}

export function filterLabel(key: string, isBeer: boolean) {
  const pair = filterLabels[key]
  if (!pair) return key
  return isBeer ? pair[1] : pair[0]
}
