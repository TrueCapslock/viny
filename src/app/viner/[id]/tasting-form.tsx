"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function TastingForm({ wineId }: { wineId: number }) {
  const router = useRouter()
  const [form, setForm] = useState({
    rating: "",
    nose: "",
    palate: "",
    finish: "",
    foodPairing: "",
    pricePaid: "",
    location: "",
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/smaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        wineId,
        rating: form.rating ? parseInt(form.rating) : null,
        pricePaid: form.pricePaid ? parseFloat(form.pricePaid) : null,
      }),
    })
    if (res.ok) {
      setForm({ rating: "", nose: "", palate: "", finish: "", foodPairing: "", pricePaid: "", location: "" })
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Rating (1-10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Pris</label>
          <input
            type="number"
            step="0.01"
            value={form.pricePaid}
            onChange={(e) => setForm({ ...form, pricePaid: e.target.value })}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Sted</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Duft (nese)</label>
        <input
          value={form.nose}
          onChange={(e) => setForm({ ...form, nose: e.target.value })}
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Smak (gane)</label>
        <input
          value={form.palate}
          onChange={(e) => setForm({ ...form, palate: e.target.value })}
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Ettersmak</label>
        <input
          value={form.finish}
          onChange={(e) => setForm({ ...form, finish: e.target.value })}
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Matparing</label>
        <input
          value={form.foodPairing}
          onChange={(e) => setForm({ ...form, foodPairing: e.target.value })}
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-wine-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-wine-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Lagrer..." : "Lagre smaksnotat"}
      </button>
    </form>
  )
}
