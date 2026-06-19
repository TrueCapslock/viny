"use client"

import { useState, useCallback, useRef } from "react"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type SearchResult = {
  productId: string
  productShortName: string
}

export function VinmonopoletSearch({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (product: SearchResult) => void
}) {
  const { isBeer } = useBeerMode()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vinmonopolet/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Søk feilet")
      }
      const data = await res.json()
      setResults(data)
      setShowResults(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil")
      setResults([])
    }
    setLoading(false)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    setShowResults(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(value), 400)
  }

  function handleSelect(product: SearchResult) {
    setQuery(product.productShortName)
    setShowResults(false)
    onSelect(product)
  }

  function handleFocus() {
    if (results.length > 0) {
      setShowResults(true)
    }
  }

  function handleClear() {
    setQuery("")
    setResults([])
    setShowResults(false)
    onSelect({ productId: "", productShortName: "" })
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-wine-500 uppercase tracking-wider">
        Søk i Vinmonopolet
        {selectedId && (
          <span className="ml-2 text-xs text-wine-400 font-normal normal-case">(1 valgt)</span>
        )}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={isBeer ? "Søk etter øl, produsent..." : "Søk etter vin, produsent..."}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 pl-10 pr-8 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
        />
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-wine-400 hover:text-wine-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 min-h-[20px]">
        {loading && (
          <span className="flex items-center gap-2 text-xs text-wine-400">
            <span className="w-3 h-3 border-2 border-wine-300 border-t-transparent rounded-full animate-spin" />
            Søker...
          </span>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {showResults && results.length > 0 && (
        <div className="max-h-60 overflow-y-auto rounded-xl border border-cream-200 bg-white shadow-lg shadow-wine-900/5 animate-fade-in">
          {results.map((product) => (
            <button
              key={product.productId}
              onClick={() => handleSelect(product)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-cream-100 last:border-0 transition-colors flex items-center gap-3 ${
                product.productId === selectedId
                  ? "bg-wine-50 text-wine-800 font-medium"
                  : "text-wine-800 hover:bg-cream-50"
              }`}
            >
              {product.productId === selectedId ? (
                <span className="w-5 h-5 rounded-full bg-wine-500 text-white flex items-center justify-center text-xs shrink-0">
                  &#10003;
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-cream-300 shrink-0" />
              )}
              <span>{product.productShortName}</span>
            </button>
          ))}
        </div>
      )}

      {!showResults && selectedId && query && (
        <div className="flex items-center gap-2.5 text-sm text-wine-700 bg-wine-50 rounded-xl px-4 py-3 border border-wine-200 animate-fade-in">
          <span className="w-5 h-5 rounded-full bg-wine-500 text-white flex items-center justify-center text-xs shrink-0">
            &#10003;
          </span>
          <span className="flex-1 truncate font-medium">{query}</span>
          <button
            onClick={handleClear}
            className="text-wine-400 hover:text-wine-600 text-xs font-medium transition-colors"
          >
            Fjern
          </button>
        </div>
      )}
    </div>
  )
}
