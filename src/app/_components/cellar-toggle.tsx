"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

export function CellarToggle({
  wineId,
  initialInCellar,
  initialQuantity,
}: {
  wineId: number
  initialInCellar: boolean
  initialQuantity: number
}) {
  const { isBeer } = useBeerMode()
  const [inCellar, setInCellar] = useState(initialInCellar)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function update(data: { inCellar: boolean; quantity: string }) {
    setLoading(true)
    const res = await fetch(`/api/viner/${wineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setInCellar(data.inCellar)
      setQuantity(parseInt(data.quantity))
      router.refresh()
    }
    setLoading(false)
  }

  if (!inCellar) {
    return (
      <button
        onClick={() => update({ inCellar: true, quantity: "1" })}
        disabled={loading}
        className="text-sm font-medium text-gold-700 bg-gold-50 hover:bg-gold-100 active:bg-gold-200 transition-colors px-3.5 py-1.5 rounded-xl flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        {loading ? "..." : isBeer ? "Legg i ølkasse" : "Legg i vinskap"}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          if (quantity <= 1) {
            update({ inCellar: false, quantity: "0" })
          } else {
            update({ inCellar: true, quantity: String(quantity - 1) })
          }
        }}
        disabled={loading}
        className="w-8 h-8 rounded-lg border border-gold-400/40 bg-white/15 flex items-center justify-center text-gold-200 hover:bg-white/25 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-gold-200 tabular-nums min-w-[1.5rem] text-center">
        {quantity}
      </span>
      <button
        onClick={() => update({ inCellar: true, quantity: String(quantity + 1) })}
        disabled={loading}
        className="w-8 h-8 rounded-lg border border-gold-400/40 bg-white/15 flex items-center justify-center text-gold-200 hover:bg-white/25 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <span className="w-px h-6 bg-white/15" />
      <button
        onClick={() => update({ inCellar: false, quantity: "0" })}
        disabled={loading}
        className="text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
      >
        Fjern
      </button>
    </div>
  )
}
