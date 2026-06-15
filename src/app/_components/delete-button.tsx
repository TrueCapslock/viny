"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteButton({
  wineId,
  wineName,
  tastingCount,
}: {
  wineId: number
  wineName: string
  tastingCount: number
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/viner/${wineId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      router.push("/")
      router.refresh()
    }
    setDeleting(false)
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-wine-300 hover:text-white transition-colors border border-wine-400/30 rounded-full px-4 py-1.5 hover:bg-white/10"
      >
        Slett
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-cream-200">
            <h3 className="text-lg font-bold text-wine-800">Slett {wineName}?</h3>
            <p className="mt-2 text-sm text-wine-500">
              {tastingCount > 0
                ? `${tastingCount} smaksnotat${tastingCount === 1 ? "" : "er"} vil også bli slettet.`
                : "Denne handlingen kan ikke angres."}
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-full border border-cream-300 px-4 py-2 text-sm font-medium text-wine-700 hover:bg-cream-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Sletter..." : "Slett"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
