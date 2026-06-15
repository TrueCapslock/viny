"use client"

import { useState, useCallback, useRef } from "react"

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
      <label className="block text-sm font-medium text-wine-700">
        Søk i Vinmonopolet
        {selectedId && (
          <span className="ml-2 text-xs text-wine-400 font-normal">(1 valgt)</span>
        )}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="Søk etter vin, produsent..."
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 pr-8 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-wine-400 hover:text-wine-600 text-sm leading-none"
          >
            &times;
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-wine-400">Søker...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {showResults && results.length > 0 && (
        <div className="max-h-60 overflow-y-auto rounded-lg border border-cream-200 bg-white shadow-sm">
          {results.map((product) => (
            <button
              key={product.productId}
              onClick={() => handleSelect(product)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-cream-100 last:border-0 transition-colors flex items-center gap-2 ${
                product.productId === selectedId
                  ? "bg-wine-50 text-wine-800 font-medium"
                  : "text-wine-800 hover:bg-cream-50"
              }`}
            >
              {product.productId === selectedId && (
                <span className="text-wine-500 text-xs shrink-0">&#10003;</span>
              )}
              <span>{product.productShortName}</span>
            </button>
          ))}
        </div>
      )}

      {!showResults && selectedId && query && (
        <div className="flex items-center gap-2 text-sm text-wine-700 bg-wine-50 rounded-lg px-3 py-2 border border-wine-200">
          <span className="text-wine-500">&#10003;</span>
          <span className="flex-1 truncate">{query}</span>
          <button
            onClick={handleClear}
            className="text-wine-400 hover:text-wine-600 text-xs"
          >
            Fjern
          </button>
        </div>
      )}
    </div>
  )
}
