"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const filters = [
  { key: "", label: "Alle" },
  { key: "red", label: "Rød" },
  { key: "white", label: "Hvit" },
  { key: "sparkling", label: "Bobler" },
  { key: "rose", label: "Rosé" },
  { key: "dessert", label: "Dessert" },
]

export function SearchAndFilter() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState("")

  function handleFilter(key: string) {
    setActive(key)
    const params = new URLSearchParams()
    if (key) params.set("type", key)
    if (query) params.set("q", query)
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : "/")
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk i dine viner..."
          className="w-full rounded-xl border border-cream-200 bg-white px-4 py-2.5 pl-10 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none shadow-sm"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilter(f.key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              active === f.key
                ? "bg-wine-600 text-white border-wine-600"
                : "bg-white text-wine-600 border-cream-200 hover:border-wine-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
