"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { wineTypes, beerTypes } from "@/lib/beer"

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
  inCellar: boolean
  quantity: string
}

export function WineForm({
  initial,
  onSave,
  saveLabel,
  warnOnUnsavedChanges = false,
}: {
  initial?: WineFormData
  onSave: (data: WineFormData) => Promise<{ ok: boolean; error?: string }>
  saveLabel?: string
  warnOnUnsavedChanges?: boolean
}) {
  const { isBeer } = useBeerMode()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef(initial?.image ?? "")
  const savedRef = useRef(false)
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
      inCellar: false,
      quantity: "0",
    },
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = warnOnUnsavedChanges && initial
    ? JSON.stringify(form) !== JSON.stringify(initial)
    : false

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    function handleDocumentClick(event: MouseEvent) {
      if (savedRef.current || event.defaultPrevented) return
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const link = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!link || link.target === "_blank") return
      if (link.href === window.location.href) return

      const ok = window.confirm("Du har ulagrede endringer. Vil du forlate siden uten å lagre?")
      if (!ok) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("click", handleDocumentClick, true)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [isDirty])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("folder", "wine-images")

    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      imageRef.current = url
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
    const res = await onSave({ ...form, image: imageRef.current || form.image })
    if (res.ok) {
      savedRef.current = true
      router.push("/")
      router.refresh()
    } else {
      setError(res.error ?? "Noe gikk galt")
    }
    setSaving(false)
  }

  const inputClass = "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Bilde</h3>
        <div className="flex items-center gap-4">
          {form.image ? (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-cream-200 shrink-0 shadow-sm group">
              <img src={form.image} alt="Forhåndsvisning" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  imageRef.current = ""
                  setForm((current) => ({ ...current, image: "" }))
                }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
              >
                Fjern
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-cream-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
          )}
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
            className="rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-xs font-medium text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
                Laster opp...
              </span>
            ) : form.image ? "Bytt bilde" : "Velg bilde"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Detaljer</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-wine-700 mb-1">Navn *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className={inputClass}
              placeholder="Château Margaux"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-wine-700 mb-1">Produsent *</label>
            <input
              required
              value={form.producer}
              onChange={(e) => setForm((current) => ({ ...current, producer: e.target.value }))}
              className={inputClass}
              placeholder="Château Margaux"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-wine-700 mb-1">Årgang</label>
              <input
                type="number"
                value={form.vintage}
                onChange={(e) => setForm((current) => ({ ...current, vintage: e.target.value }))}
                className={inputClass}
                placeholder="2020"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-wine-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
                className={inputClass}
              >
                <option value="">Velg type...</option>
                {isBeer && (
                  <optgroup label="Øl">
                    {beerTypes.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={isBeer ? "Vin" : "Type"}>
                  {wineTypes.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <div>
              <label className="block text-xs font-medium text-wine-700 mb-1">{isBeer ? "Stil" : "Drue"}</label>
            <input
              value={form.varietal}
              onChange={(e) => setForm((current) => ({ ...current, varietal: e.target.value }))}
              className={inputClass}
              placeholder={isBeer ? "IPA" : "Cabernet Sauvignon"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-wine-700 mb-1">Region</label>
              <input
                value={form.region}
                onChange={(e) => setForm((current) => ({ ...current, region: e.target.value }))}
                className={inputClass}
                placeholder="Bordeaux"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-wine-700 mb-1">Land</label>
              <input
                value={form.country}
                onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))}
                className={inputClass}
                placeholder="Frankrike"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Notater</h3>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
          className={inputClass + " resize-none"}
          placeholder={isBeer ? "Dine notater om ølet..." : "Dine notater om vinen..."}
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">{isBeer ? "Lager" : "Vinskap"}</h3>
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              role="checkbox"
              aria-checked={form.inCellar}
              tabIndex={0}
              onClick={() => setForm((current) => ({ ...current, inCellar: !current.inCellar, quantity: !current.inCellar ? "1" : "0" }))}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setForm((current) => ({ ...current, inCellar: !current.inCellar, quantity: !current.inCellar ? "1" : "0" })) } }}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.inCellar ? "bg-wine-600" : "bg-cream-300"}`}
            >
              <div className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm absolute top-[3px] transition-transform ${form.inCellar ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
            </div>
            <span className="text-sm font-medium text-wine-800">{isBeer ? "På lager" : "I mitt vinskap"}</span>
          </label>

          {form.inCellar && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-medium text-wine-700 mb-1">{isBeer ? "Antall" : "Antall flasker"}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, quantity: String(Math.max(0, parseInt(current.quantity || "0") - 1)) }))}
                  className="w-9 h-9 rounded-xl border border-cream-200 bg-white flex items-center justify-center text-wine-700 hover:bg-wine-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M5 12h14" />
                  </svg>
                </button>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                  className="w-16 text-center rounded-xl border border-cream-200 bg-white px-2 py-2 text-sm font-medium text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, quantity: String(parseInt(current.quantity || "0") + 1) }))}
                  className="w-9 h-9 rounded-xl border border-cream-200 bg-white flex items-center justify-center text-wine-700 hover:bg-wine-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || uploading}
        className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3.5 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg hover:shadow-wine-600/30 active:scale-[0.98]"
      >
        {uploading ? "Laster opp bilde..." : saving ? "Lagrer..." : saveLabel ?? (isBeer ? "Lagre øl" : "Lagre vin")}
      </button>
    </form>
  )
}
