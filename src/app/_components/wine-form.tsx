"use client"

import { useState, useRef } from "react"
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
  image: string
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
  const fileRef = useRef<HTMLInputElement>(null)
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
      image: "",
    },
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fd = new FormData()
    fd.set("file", file)

    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setForm((current) => ({ ...current, image: url }))
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? "Kunne ikke laste opp bildet")
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) {
      setError("Vent til bildet er ferdig lastet opp")
      return
    }
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
        <label className="block text-xs font-medium text-wine-700 mb-1">Bilde</label>
        <div className="flex items-center gap-3">
          {form.image ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-cream-200 shrink-0">
              <img src={form.image} alt="Forhåndsvisning" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, image: "" }))}
                className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-bl-xl flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2 text-xs text-wine-600 hover:border-wine-300 transition-colors disabled:opacity-50"
          >
            {uploading ? "Laster opp..." : form.image ? "Bytt bilde" : "Velg bilde"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Navn *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-wine-700 mb-1">Produsent *</label>
        <input
          required
          value={form.producer}
          onChange={(e) => setForm((current) => ({ ...current, producer: e.target.value }))}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Årgang</label>
          <input
            type="number"
            value={form.vintage}
            onChange={(e) => setForm((current) => ({ ...current, vintage: e.target.value }))}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
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
          onChange={(e) => setForm((current) => ({ ...current, varietal: e.target.value }))}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Region</label>
          <input
            value={form.region}
            onChange={(e) => setForm((current) => ({ ...current, region: e.target.value }))}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-wine-700 mb-1">Land</label>
          <input
            value={form.country}
            onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))}
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
          onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving || uploading}
        className="w-full rounded-full bg-wine-600 px-4 py-3 text-sm font-medium text-white hover:bg-wine-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {uploading ? "Laster opp bilde..." : saving ? "Lagrer..." : saveLabel}
      </button>
    </form>
  )
}
