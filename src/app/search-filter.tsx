"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const filters = [
  { key: "", label: "Alle" },
  { key: "red", label: "Rød" },
  { key: "white", label: "Hvit" },
  { key: "sparkling", label: "Bobler" },
  { key: "rose", label: "Rosé" },
  { key: "dessert", label: "Dessert" },
]

export function SearchAndFilter({
  initialQuery = "",
  initialType = "",
}: {
  initialQuery?: string
  initialType?: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(initialType)

  useEffect(() => {
    const q = sp.get("q") ?? ""
    const t = sp.get("type") ?? ""
    setQuery(q)
    setActive(t)
  }, [sp])

  function apply(q: string, t: string) {
    const params = new URLSearchParams()
    const currentAll = sp.get("all")
    if (t) params.set("type", t)
    if (q) params.set("q", q)
    if (currentAll) params.set("all", currentAll)
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : "/")
  }

  function handleFilter(key: string) {
    setActive(key)
    apply(query, key)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      apply(query, active)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Søk i dine viner..."
          className="w-full rounded-xl border border-cream-200 bg-white pl-10 pr-4 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none shadow-sm transition-all"
        />
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        {query && (
          <button
            onClick={() => { setQuery(""); apply("", active) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-wine-400 hover:text-wine-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilter(f.key)}
            className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
              active === f.key
                ? "bg-wine-600 text-white border-wine-600 shadow-sm shadow-wine-600/20"
                : "bg-white text-wine-600 border-cream-200 hover:border-wine-300 hover:bg-wine-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
