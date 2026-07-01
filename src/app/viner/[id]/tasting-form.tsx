"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StarRating } from "@/app/_components/star-rating"

export function TastingForm({ wineId }: { wineId: number }) {
  const router = useRouter()
  const [form, setForm] = useState({
    rating: 0,
    nose: "",
    palate: "",
    finish: "",
    foodPairing: "",
    pricePaid: "",
    location: "",
    comment: "",
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/smaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // NOTE: if you add a field to the form state above, also add it here
      // (the `...form` spread was removed so each field is trimmed explicitly).
      body: JSON.stringify({
        wineId,
        rating: form.rating || null,
        nose: form.nose?.trim() || null,
        palate: form.palate?.trim() || null,
        finish: form.finish?.trim() || null,
        foodPairing: form.foodPairing?.trim() || null,
        pricePaid: form.pricePaid ? parseFloat(form.pricePaid) : null,
        location: form.location?.trim() || null,
        comment: form.comment?.trim() || null,
      }),
    })
    if (res.ok) {
      setForm({ rating: 0, nose: "", palate: "", finish: "", foodPairing: "", pricePaid: "", location: "", comment: "" })
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1.5">Vurdering</label>
        <StarRating value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1">Pris</label>
          <input
            type="number"
            step="0.01"
            value={form.pricePaid}
            onChange={(e) => setForm({ ...form, pricePaid: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1">Sted</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            placeholder="Hvor?"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">Duft (nese)</label>
        <input
          value={form.nose}
          onChange={(e) => setForm({ ...form, nose: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          placeholder="Hva kjenner du på nesen?"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">Smak (gane)</label>
        <input
          value={form.palate}
          onChange={(e) => setForm({ ...form, palate: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          placeholder="Hvordan smaker det?"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">Ettersmak</label>
        <input
          value={form.finish}
          onChange={(e) => setForm({ ...form, finish: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          placeholder="Hvor lenge varer ettersmaken?"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">Matparing</label>
        <input
          value={form.foodPairing}
          onChange={(e) => setForm({ ...form, foodPairing: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          placeholder="Hva spiste du til?"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">Generelle notater</label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all resize-none"
          placeholder="Andre observasjoner, kontekst, hvem du delte vinen med..."
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg hover:shadow-wine-600/30 active:scale-[0.98]"
      >
        {saving ? "Lagrer..." : "Lagre smaksnotat"}
      </button>
    </form>
  )
}
