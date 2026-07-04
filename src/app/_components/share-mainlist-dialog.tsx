"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useBeerMode } from "./beer-mode-provider"

/**
 * v0.15.0 list-merge share dialog.
 *
 * Replaces the v0.14.x `/api/shared-lists` UI. The new flow is a 2-button
 * "pick winner" picker; both buttons post to `/api/friends/share` with
 * `{ friendUserId, winner, migrateLoserWines: true }` so loser-list wines
 * are bulk-relocated into the winner list (the safe default — never
 * silently destroys anyone's wines on a merge).
 *
 * Errors render inline. The parent only knows success/failure via the
 * `onShared` + `onClose` callbacks; the API endpoint choice lives here so
 * the page doesn't have to know about the v0.14.x→v0.15.0 endpoint shift.
 *
 * Portal'd to `document.body`: the same stacking-context trap that bit
 * AddToListDialog applies here (VennerPage renders inside the WineCard
 * + share-target row which carries its own z-index/translate).
 */
type FriendInfo = {
  userId: number
  name: string | null
  email: string
}

export function ShareMainlistDialog({
  friend,
  onShared,
  onClose,
}: {
  friend: FriendInfo
  onShared: () => void
  onClose: () => void
}) {
  const { isBeer } = useBeerMode()
  const [sharing, setSharing] = useState<"mine" | "theirs" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleShare(winner: "mine" | "theirs") {
    setSharing(winner)
    setError(null)
    try {
      const res = await fetch("/api/friends/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUserId: friend.userId,
          winner,
          // Safe default: never destroy the loser's wines on a merge.
          // The destructive path (migrateLoserWines: false) is reserved
          // for an explicit "slett vennens" advance option we'll add if
          // users ask for one.
          migrateLoserWines: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Kunne ikke dele listen")
      }
      onShared()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt")
    } finally {
      setSharing(null)
    }
  }

  const itemLabel = isBeer ? "øl" : "vin"
  const friendName = friend.name ?? friend.email

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={sharing ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          disabled={sharing !== null}
          aria-label="Lukk"
          className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-wine-900 mb-1">
          {isBeer ? "Del ølliste" : "Del vinliste"}
        </h2>
        <p className="text-sm text-wine-500 mb-5">
          Velg hvem sin liste som blir den felles. Listene slås sammen
          og begge kan redigere den videre.{" "}
          <span className="font-medium text-wine-700">Med {friendName}.</span>
        </p>

        <div className="space-y-2">
          <button
            onClick={() => handleShare("mine")}
            disabled={sharing !== null}
            data-testid="share-mine"
            className="group w-full text-left rounded-xl border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-full bg-wine-100 group-hover:bg-wine-600 group-hover:text-white text-wine-700 items-center justify-center text-xs font-bold transition-colors">
                A
              </span>
              <p className="text-sm font-semibold text-wine-800">
                Din liste blir den felles
              </p>
            </div>
            <p className="text-xs text-wine-500 mt-1.5 leading-relaxed">
              {friendName}s {itemLabel} flyttes inn i din hovedliste.
              Vinskapet følger felleslisten.
            </p>
          </button>
          <button
            onClick={() => handleShare("theirs")}
            disabled={sharing !== null}
            data-testid="share-theirs"
            className="group w-full text-left rounded-xl border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-full bg-cream-200 group-hover:bg-wine-600 group-hover:text-white text-wine-700 items-center justify-center text-xs font-bold transition-colors">
                B
              </span>
              <p className="text-sm font-semibold text-wine-800">
                {friendName}s liste blir den felles
              </p>
            </div>
            <p className="text-xs text-wine-500 mt-1.5 leading-relaxed">
              Dine {itemLabel} flyttes inn i {friendName}s hovedliste.
              Vinskapet følger felleslisten.
            </p>
          </button>
        </div>

        {sharing !== null && (
          <div
            data-testid="share-loading"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-wine-500"
          >
            <div className="w-4 h-4 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
            {sharing === "mine"
              ? "Slår sammen din liste med vennens…"
              : "Flytter dine viner inn i vennens liste…"}
          </div>
        )}

        {error && (
          <div
            data-testid="share-error"
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
