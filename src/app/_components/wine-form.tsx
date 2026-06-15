"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type WineFormData = {
  name: string
  producer: string
  vintage: string
  varietal: string
  region: string
  country: string
  type: string
  notes: string
}

export function WineForm({
  initial,
  onSave,
  saveLabel = "Lagre vin",
}: {
  initial?: WineFormData
  onSave: (data: WineFormData) => Promise<{ ok: boolean; error?: string }>
  saveLabel?: string
}) {
  const router = useRouter()
  const [form, setForm] = useState<WineFormData>(
    initial ?? {
      name: "",
      producer: "",
      vintage: "",
      varietal: "",
      region: "",
      country: "",
      type: "",
      notes: "",
    },
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await onSave(form)
    if (res.ok) {
      router.push("/")
      router.refresh()
    } else {
      setError(res.error ?? "Noe gikk galt")
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Navn *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Produsent *</label>
        <input
          required
          value={form.producer}
          onChange={(e) => setForm({ ...form, producer: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Årgang</label>
          <input
            type="number"
            value={form.vintage}
            onChange={(e) => setForm({ ...form, vintage: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          >
            <option value="">Velg...</option>
            <option value="red">Rødvin</option>
            <option value="white">Hvitvin</option>
            <option value="sparkling">Mousserende</option>
            <option value="rose">Rosé</option>
            <option value="dessert">Dessertvin</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Drue</label>
        <input
          value={form.varietal}
          onChange={(e) => setForm({ ...form, varietal: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Region</label>
          <input
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Land</label>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Notater</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-wine-600 px-4 py-3 text-sm font-medium text-white hover:bg-wine-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {saving ? "Lagrer..." : saveLabel}
      </button>
    </form>
  )
}
