"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type Suggestion = {
  id: number
  name: string
  producer: string
  vintage: number | null
  message: string | null
  fromUser: { id: number; name: string | null; email: string; image: string | null }
}

export function NotificationBell() {
  const { isBeer } = useBeerMode()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/forslag")
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data.received ?? [])
        setCount(data.received?.length ?? 0)
      })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleAccept(id: number) {
    await fetch(`/api/forslag/${id}/accept`, { method: "POST" })
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setCount((c) => Math.max(0, c - 1))
    router.refresh()
  }

  async function handleDecline(id: number) {
    await fetch(`/api/forslag/${id}`, { method: "DELETE" })
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setCount((c) => Math.max(0, c - 1))
  }

  if (count === 0 && !open) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-wine-200 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-cream-200 shadow-xl shadow-black/10 z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-cream-100">
            <p className="text-sm font-bold text-wine-900">{isBeer ? "Ølforslag" : "Vinforslag"}</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-wine-400">
                Ingen ventende forslag
              </div>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="px-4 py-3 border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {s.fromUser.image ? (
                        <img src={s.fromUser.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-3.5 h-3.5 text-wine-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-wine-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-wine-500 truncate">
                        {s.producer}{s.vintage ? `, ${s.vintage}` : ""}
                      </p>
                      <p className="text-[10px] text-wine-400 mt-0.5">
                        fra {s.fromUser.name ?? s.fromUser.email}
                      </p>
                      {s.message && (
                        <p className="text-[10px] text-wine-500 mt-1 bg-cream-50 rounded-md px-2 py-1 italic leading-relaxed">
                          &ldquo;{s.message}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleAccept(s.id)}
                        className="rounded-full bg-wine-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-wine-700 transition-colors whitespace-nowrap"
                      >
                        Legg til
                      </button>
                      <button
                        onClick={() => handleDecline(s.id)}
                        className="rounded-full border border-cream-200 px-2.5 py-1 text-[10px] font-medium text-wine-500 hover:bg-cream-50 transition-colors whitespace-nowrap"
                      >
                        Avslå
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
