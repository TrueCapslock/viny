"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { StarRating } from "@/app/_components/star-rating"

export function TastingFormDialog({ wineId }: { wineId: number }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [nose, setNose] = useState("")
  const [palate, setPalate] = useState("")
  const [finish, setFinish] = useState("")
  const [foodPairing, setFoodPairing] = useState("")
  const [pricePaid, setPricePaid] = useState("")
  const [location, setLocation] = useState("")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch("/api/smaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wineId,
        rating: rating || null,
        nose: nose?.trim() || null,
        palate: palate?.trim() || null,
        finish: finish?.trim() || null,
        foodPairing: foodPairing?.trim() || null,
        pricePaid: pricePaid ? parseFloat(pricePaid) : null,
        location: location?.trim() || null,
        comment: comment?.trim() || null,
      }),
    })
    if (res.ok) {
      setOpen(false)
      setRating(0)
      setNose("")
      setPalate("")
      setFinish("")
      setFoodPairing("")
      setPricePaid("")
      setLocation("")
      setComment("")
      router.refresh()
    } else {
      setError("Noe gikk galt")
    }
    setSaving(false)
  }

  const inputClass = "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

  // Portal the overlay to document.body for consistency with
  // AddToListDialog. Today this dialog has no transformed ancestor
  // (so the z-50 would work fine), but portaling defends against
  // future transforms on any ancestor that would otherwise trap
  // z-50 in a stacking context.
  const dialog = open
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-scale-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-wine-900 mb-4">Legg til smaking</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Vurdering</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Duft</label>
                <textarea
                  value={nose}
                  onChange={(e) => setNose(e.target.value)}
                  rows={2}
                  className={inputClass + " resize-none"}
                  placeholder="Notater om duft..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Smak</label>
                <textarea
                  value={palate}
                  onChange={(e) => setPalate(e.target.value)}
                  rows={2}
                  className={inputClass + " resize-none"}
                  placeholder="Notater om smak..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Ettersmak</label>
                <textarea
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  rows={2}
                  className={inputClass + " resize-none"}
                  placeholder="Notater om ettersmak..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Matparring</label>
                <input
                  value={foodPairing}
                  onChange={(e) => setFoodPairing(e.target.value)}
                  className={inputClass}
                  placeholder="F.eks. lam, ost..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-wine-700 mb-1">Pris (kr)</label>
                  <input
                    type="number"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(e.target.value)}
                    className={inputClass}
                    placeholder="299"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-wine-700 mb-1">Sted</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClass}
                    placeholder="Hjemme"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-wine-700 mb-1">Generelle notater</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className={inputClass + " resize-none"}
                  placeholder="Andre observasjoner, kontekst, hvem du delte vinen med..."
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-2.5 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20"
                >
                  {saving ? "Lagrer..." : "Lagre smaking"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-cream-300 px-4 py-2.5 text-sm font-medium text-wine-600 hover:bg-cream-50 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-wine-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-wine-700 transition-colors whitespace-nowrap shadow-sm"
      >
        + Legg til
      </button>
      {dialog}
    </>
  )
}
