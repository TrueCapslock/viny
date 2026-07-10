"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useBeerMode } from "./beer-mode-provider"

/**
 * v0.15.1: confirmation dialog for stopping a shared list.
 *
 * Called from the friend row on /venner when the list is currently
 * shared. The split itself runs server-side in DELETE /api/friends/share,
 * which gives BOTH users a copy of the shared list and deletes the
 * shared list row. This dialog is the confirmation step before that
 * irreversible (in the sense of "you'll never get the same shared
 * list back together again") state change.
 *
 * Portal'd to `document.body` for the same stacking-context reason as
 * ShareMainlistDialog (VennerPage renders inside the WineCard row).
 */
type FriendInfo = {
  userId: number
  name: string | null
  email: string
}

export function StopSharingDialog({
  friend,
  onStopped,
  onClose,
}: {
  friend: FriendInfo
  onStopped: () => void
  onClose: () => void
}) {
  const { isBeer } = useBeerMode()
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStop() {
    setStopping(true)
    setError(null)
    try {
      const res = await fetch("/api/friends/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        // friendUserId is sent for backward compat with the v0.15.0
        // endpoint contract; the server ignores it and finds all
        // sharers automatically.
        body: JSON.stringify({ friendUserId: friend.userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Kunne ikke stoppe delingen")
      }
      onStopped()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt")
    } finally {
      setStopping(false)
    }
  }

  const friendName = friend.name ?? friend.email
  const itemLabel = isBeer ? "ølliste" : "vinliste"

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={stopping ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          disabled={stopping}
          aria-label="Lukk"
          className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-wine-900 mb-1">
          Stopp å dele {itemLabel}
        </h2>
        <p className="text-sm text-wine-500 mb-2 leading-relaxed">
          Både du og{" "}
          <span className="font-medium text-wine-700">{friendName}</span>{" "}
          får hver sin kopi av den delte {itemLabel}.
        </p>
        <p className="text-sm text-wine-500 mb-5 leading-relaxed">
          Den delte listen blir slettet, og dere kan redigere koppiene
          uavhengig av hverandre.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={stopping}
            className="flex-1 rounded-full border border-cream-300 px-4 py-2 text-sm font-medium text-wine-600 hover:bg-cream-50 transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleStop}
            disabled={stopping}
            data-testid="stop-sharing-confirm"
            className="flex-1 rounded-full bg-wine-600 px-4 py-2 text-sm font-medium text-white hover:bg-wine-700 transition-colors disabled:opacity-50"
          >
            {stopping ? "Stopper…" : "Stopp å dele"}
          </button>
        </div>

        {stopping && (
          <div
            data-testid="stop-sharing-loading"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-wine-500"
          >
            <div className="w-4 h-4 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
            Kopierer listen til begge…
          </div>
        )}

        {error && (
          <div
            data-testid="stop-sharing-error"
            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mt-4"
          >
            {error}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
