"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { useBeerMode } from "./beer-mode-provider"

/**
 * v0.15.0 list-merge share dialog.
 *
 * Replaces the v0.14.x `/api/shared-lists` UI. The new flow is a 3-button
 * picker; each button posts to `/api/friends/share-invite` with a
 * distinct `winner` value. `migrateLoserWines` is derived server-side
 * from the winner so the three options are meaningfully distinct:
 *
 *   - "merge"  (primary, non-destructive): all wines from both lists
 *     survive on the shared list. Collision handling: OR on inCellar,
 *     sum on quantity, keep the earlier addedAt.
 *   - "mine"   (secondary, destructive): caller's list wins; the
 *     invitee's wines are cascade-deleted.
 *   - "theirs" (secondary, destructive): invitee's list wins; the
 *     caller's wines are cascade-deleted.
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
type ShareMode = "mine" | "theirs" | "merge"

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
  const [sharing, setSharing] = useState<ShareMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleShare(winner: ShareMode) {
    setSharing(winner)
    setError(null)
    try {
      // v0.15.1: list-share is now invite-then-accept. Posting to
      // /api/friends/share-invite only creates a *pending* ShareInvite
      // row; the merge happens later when the recipient accepts via
      // /api/friends/share-invite/[id]/accept. The migrateLoserWines
      // flag is derived from the winner server-side (see the route).
      const res = await fetch("/api/friends/share-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUserId: friend.userId,
          winner,
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
  const itemLabelPlural = isBeer ? "ølene" : "vinene"
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
          Hvordan vil dere slå sammen listene?{" "}
          <span className="font-medium text-wine-700">Med {friendName}.</span>
        </p>

        <div className="space-y-2">
          {/* Primary: merge — non-destructive, all wines preserved. */}
          <button
            onClick={() => handleShare("merge")}
            disabled={sharing !== null}
            data-testid="share-merge"
            className="group w-full text-left rounded-xl border-2 border-wine-300 bg-wine-50/60 p-4 hover:border-wine-500 hover:bg-wine-50 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-full bg-wine-600 text-white items-center justify-center text-xs font-bold">
                A+B
              </span>
              <p className="text-sm font-semibold text-wine-900">
                Slå sammen listene
              </p>
            </div>
            <p className="text-xs text-wine-600 mt-1.5 leading-relaxed">
              Alle {itemLabelPlural} bevares. Den felles listen tar vare på
              både dine og {friendName}s {itemLabel}, og begge kan
              redigere videre.
            </p>
          </button>

          {/* Secondary: mine — destructive, invitee's wines are dropped. */}
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
              {friendName}s {itemLabelPlural} <span className="font-medium text-red-600">blir slettet</span>.
              Den felles listen blir din hovedliste.
            </p>
          </button>

          {/* Secondary: theirs — destructive, caller's wines are dropped. */}
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
              Dine {itemLabelPlural} <span className="font-medium text-red-600">blir slettet</span>.
              Den felles listen blir {friendName}s hovedliste.
            </p>
          </button>
        </div>

        {sharing !== null && (
          <div
            data-testid="share-loading"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-wine-500"
          >
            <div className="w-4 h-4 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
            {sharing === "merge"
              ? "Oppretter invitasjon til sammenslåing…"
              : sharing === "mine"
                ? `Oppretter invitasjon — ${friendName}s ${itemLabelPlural} blir slettet ved godkjenning…`
                : "Oppretter invitasjon — dine viner blir slettet ved godkjenning…"}
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
