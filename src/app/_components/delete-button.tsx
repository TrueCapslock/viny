"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/app/_components/icons"

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
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/viner/${wineId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/")
        router.refresh()
        return
      }
      // Non-2xx: surface a readable message so the user knows the
      // delete didn't happen. Without this the dialog re-enabled the
      // button silently and the user thought the click "didn't work"
      // — which is exactly the bug that motivated the FK-constraint
      // + handler fix in the same commit.
      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      setError(data?.error ?? `Kunne ikke slette (HTTP ${res.status})`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nettverksfeil")
    } finally {
      setDeleting(false)
    }
  }

  function openConfirm() {
    setError(null)
    setShowConfirm(true)
  }

  return (
    <>
      <button
        onClick={openConfirm}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-red-700 hover:bg-cream-50 rounded-xl transition-colors"
      >
        <Icon name="delete" size={18} className="text-red-500" />
        Slett
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-cream-200 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-wine-800 text-center">Slett {wineName}?</h3>
            <p className="mt-2 text-sm text-wine-500 text-center">
              {tastingCount > 0
                ? `${tastingCount} smaksnotat${tastingCount === 1 ? "" : "er"} vil også bli slettet.`
                : "Denne handlingen kan ikke angres."}
            </p>
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-full border border-cream-300 px-4 py-2.5 text-sm font-medium text-wine-700 hover:bg-cream-50 transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all shadow-md"
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
