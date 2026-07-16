"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Tasting } from "@/generated/prisma/client"
import { StarRating } from "@/app/_components/star-rating"

type TastingInitial = Pick<
  Tasting,
  | "id"
  | "date"
  | "rating"
  | "nose"
  | "palate"
  | "finish"
  | "foodPairing"
  | "pricePaid"
  | "location"
  | "comment"
>

// Wire the Tasting.date (DateTime, server-defined) into an `<input
// type="date">` value (YYYY-MM-DD, browser-defined, LOCAL time). The
// inverse direction (string back to Date) is just `new Date(value)` in
// the server route.
function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function TastingForm({
  wineId,
  initial,
}: {
  wineId: number
  /** Pass when editing an existing tasting. Absence = create mode. */
  initial?: TastingInitial
}) {
  const router = useRouter()
  const isEdit = !!initial

  const [form, setForm] = useState({
    // `date` is only meaningful in edit mode — new Tasting rows get
    // date=now() by the schema default. We initialise from `initial` so
    // a backdated edit preserves the user's existing date.
    date:
      isEdit && initial
        ? toDateInputValue(initial.date)
        : "",
    rating: initial?.rating ?? 0,
    nose: initial?.nose ?? "",
    palate: initial?.palate ?? "",
    finish: initial?.finish ?? "",
    foodPairing: initial?.foodPairing ?? "",
    pricePaid:
      initial?.pricePaid != null ? String(initial.pricePaid) : "",
    location: initial?.location ?? "",
    comment: initial?.comment ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Body shape is identical for POST and PUT: same trim/sanitize
    // pattern as the original POST flow. POST additionally threads
    // wineId; PUT additionally threads date (optional — existing date
    // is preserved if omitted).
    const payload = {
      ...(isEdit ? {} : { wineId }),
      ...(isEdit && form.date ? { date: form.date } : {}),
      rating: form.rating || null,
      nose: form.nose?.trim() || null,
      palate: form.palate?.trim() || null,
      finish: form.finish?.trim() || null,
      foodPairing: form.foodPairing?.trim() || null,
      pricePaid: form.pricePaid ? parseFloat(form.pricePaid) : null,
      location: form.location?.trim() || null,
      comment: form.comment?.trim() || null,
    }

    const endpoint = isEdit
      ? `/api/smaking/${initial!.id}`
      : "/api/smaking"
    const res = await fetch(endpoint, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      // Both modes rely on router.refresh() to re-render the server page
      // with the latest tasting row. The dialog wrapper (which mounts
      // this form) reads `open=false` from its parent state after the
      // form unmounts — see TastingEditDialog.
      router.refresh()
      if (!isEdit) {
        setForm({
          date: "",
          rating: 0,
          nose: "",
          palate: "",
          finish: "",
          foodPairing: "",
          pricePaid: "",
          location: "",
          comment: "",
        })
      }
    } else {
      setError("Noe gikk galt")
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEdit && (
        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1">
            Dato for smaking
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1.5">
          Vurdering
        </label>
        <StarRating
          value={form.rating}
          onChange={(r) => setForm({ ...form, rating: r })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1">
            Pris
          </label>
          <input
            type="number"
            step="0.01"
            value={form.pricePaid}
            onChange={(e) => setForm({ ...form, pricePaid: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1">
            Sted
          </label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">
          Duft (nese)
        </label>
        <input
          value={form.nose}
          onChange={(e) => setForm({ ...form, nose: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">
          Smak (gane)
        </label>
        <input
          value={form.palate}
          onChange={(e) => setForm({ ...form, palate: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">
          Ettersmak
        </label>
        <input
          value={form.finish}
          onChange={(e) => setForm({ ...form, finish: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">
          Matparing
        </label>
        <input
          value={form.foodPairing}
          onChange={(e) => setForm({ ...form, foodPairing: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-wine-700 mb-1">
          Generelle notater
        </label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg hover:shadow-wine-600/30 active:scale-[0.98]"
      >
        {saving
          ? "Lagrer..."
          : isEdit
            ? "Oppdater smaking"
            : "Lagre smaksnotat"}
      </button>
    </form>
  )
}
