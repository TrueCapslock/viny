"use client"

import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (pwNew !== pwConfirm) {
      setPwError("Passordene er ikke like")
      return
    }
    if (pwNew.length < 6) {
      setPwError("Nytt passord må være minst 6 tegn")
      return
    }

    setPwSaving(true)
    const res = await fetch("/api/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
    })
    const data = await res.json()
    setPwSaving(false)

    if (!res.ok) {
      setPwError(data.error ?? "Noe gikk galt")
      return
    }

    setPwSuccess(true)
    setPwCurrent("")
    setPwNew("")
    setPwConfirm("")
  }

  const inputClass = "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors z-10"
          aria-label="Lukk"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-wine-900 mb-4">Endre passord</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {pwError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Passordet er oppdatert
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-wine-700 mb-1.5">Nåværende passord</label>
            <input
              type="password"
              required
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-wine-700 mb-1.5">Nytt passord</label>
            <input
              type="password"
              required
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-wine-700 mb-1.5">Gjenta nytt passord</label>
            <input
              type="password"
              required
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-wine-700 hover:bg-cream-50 transition-all"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={pwSaving}
              className="flex-1 rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-2.5 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 active:scale-[0.98]"
            >
              {pwSaving ? "Lagrer..." : "Oppdater passord"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return mounted ? createPortal(dialog, document.body) : null
}
