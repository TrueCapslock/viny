"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { COMMON_GRAPES } from "@/lib/grapes"

const inputClass = "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

export function GrapeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const filtered = useMemo(() => {
    if (!query) return COMMON_GRAPES
    const q = query.toLowerCase()
    return COMMON_GRAPES.filter((g) => g.toLowerCase().includes(q))
  }, [query])

  function select(grape: string) {
    setQuery(grape)
    onChange(grape)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          select(filtered[activeIndex])
        }
        break
      case "Escape":
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => { setOpen(true); setActiveIndex(-1) }}
        onKeyDown={handleKeyDown}
        className={inputClass}
        placeholder="Cabernet Sauvignon"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-cream-200 bg-white shadow-lg animate-scale-in">
          {filtered.map((grape, i) => (
            <li
              key={grape}
              onClick={() => select(grape)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIndex
                  ? "bg-wine-50 text-wine-900"
                  : "text-wine-700 hover:bg-cream-50"
              }`}
            >
              {grape}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
