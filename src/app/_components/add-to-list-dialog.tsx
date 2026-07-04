"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Plus } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { useLists, useWineLists } from "@/hooks/use-data"

export function AddToListDialog({
  wineId,
  wineName,
  onClose,
}: {
  wineId: number
  wineName: string
  onClose: () => void
}) {
  const { isBeer } = useBeerMode()
  const { lists, mutate: mutateLists } = useLists()
  const { listIds, mutate: mutateMembership } = useWineLists(wineId)
  const [membership, setMembership] = useState<Set<number>>(() => new Set(listIds))
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  // Sync the optimistic `membership` Set with the SWR-cached `listIds`.
  // useWineLists returns a fresh `listIds` array reference on every
  // render, so the bare `setMembership(new Set(listIds))` previous
  // implementation triggered React's "Maximum update depth exceeded"
  // guard under the dialog's toggle flow — setMembership called →
  // re-render → new listIds ref → effect fires again → loop.
  //
  // Bail out when the new listIds describe the same ID set as `prev`
  // so React reads the same state and skips the re-render. The `react-
  // hooks/set-state-in-effect` lint rule trips on any synchronous
  // setState in an effect, but React's bailout on identical state
  // identity means no cascading render actually happens here — the
  // rule is over-defensive for SWR-cache-mirror patterns. Suppressed
  // for this single effect (block-style because the rule fires at the
  // setMembership call inside the body, not the useEffect call
  // itself, so `disable-next-line` doesn't reach it); the alternative
  // (an optimistic-overlay Map + useMemo derivation) is a meaningful
  // rewrite that's not in scope for this fix.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMembership((prev) => {
      if (
        prev.size === listIds.length &&
        listIds.every((id) => prev.has(id))
      ) {
        return prev
      }
      return new Set(listIds)
    })
  }, [listIds])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function toggle(listId: number) {
    if (toggling !== null) return
    const wasMember = membership.has(listId)
    setToggling(listId)
    setError(null)
    // Optimistic flip
    setMembership((s) => {
      const n = new Set(s)
      if (wasMember) n.delete(listId)
      else n.add(listId)
      return n
    })
    try {
      const res = wasMember
        ? await fetch(`/api/viner/${wineId}/lists/${listId}`, { method: "DELETE" })
        : await fetch(`/api/viner/${wineId}/lists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listId }),
          })
      if (!res.ok) throw new Error("Kunne ikke oppdatere listen")
      mutateMembership()
      mutateLists()
    } catch (e) {
      // Revert optimistic change
      setMembership((s) => {
        const n = new Set(s)
        if (wasMember) n.add(listId)
        else n.delete(listId)
        return n
      })
      setError(e instanceof Error ? e.message : "Noe gikk galt")
    } finally {
      setToggling(null)
    }
  }

  async function createList() {
    const trimmed = newName.trim()
    if (!trimmed || creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, addWineId: wineId }),
      })
      if (!res.ok) throw new Error("Kunne ikke opprette liste")
      const list = await res.json()
      mutateLists([list, ...lists], false)
      setMembership((s) => {
        const n = new Set(s)
        n.add(list.id)
        return n
      })
      mutateMembership()
      setNewName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt")
    } finally {
      setCreating(false)
    }
  }

  // Portal to document.body: the dialog lives inside the floating action
  // pill (which uses `translate-y-1/2`), and that translate creates a
  // stacking context that would trap z-50 here. Without the portal the
  // tasting-list collapse chevron — later in the DOM, in the root's
  // stacking context — would bleed through on top of the dialog.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-wine-900 mb-1">
          {isBeer ? "Legg øl i liste" : "Legg vin i liste"}
        </h2>
        <p className="text-sm text-wine-500 mb-4 truncate">{wineName}</p>

        {lists.length === 0 ? (
          <p className="text-xs text-wine-400 py-2 mb-2">
            Du har ingen lister ennå. Opprett en under.
          </p>
        ) : (
          <div className="space-y-1 mb-4 max-h-72 overflow-y-auto">
            {lists.map((list) => {
              const isMember = membership.has(list.id)
              return (
                <button
                  key={list.id}
                  onClick={() => toggle(list.id)}
                  disabled={toggling === list.id}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isMember
                      ? "border-wine-400 bg-wine-50"
                      : "border-cream-200 hover:border-cream-300"
                  } ${toggling === list.id ? "opacity-60" : ""}`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                      isMember ? "bg-wine-600 border-wine-600" : "border-cream-300 bg-white"
                    }`}
                  >
                    {isMember && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-wine-800 truncate block">
                      {list.name}
                    </span>
                    <span className="text-xs text-wine-400">
                      {list._count?.wines ?? 0} {list._count?.wines === 1 ? (isBeer ? "øl" : "vin") : isBeer ? "øl" : "viner"}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 mb-3">
            {error}
          </div>
        )}

        <div className="border-t border-cream-200 pt-4 mt-2">
          <label className="block text-xs font-medium text-wine-600 mb-1">
            {isBeer ? "Ny ølliste" : "Ny vinliste"}
          </label>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  createList()
                }
              }}
              placeholder={isBeer ? "F.eks. Favoritt-øl" : "F.eks. Favoritt-viner"}
              className="flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            />
            <button
              type="button"
              onClick={createList}
              disabled={!newName.trim() || creating}
              className="rounded-xl bg-wine-600 text-white px-3 py-2 text-sm font-medium hover:bg-wine-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-6 h-6" />
              {creating ? "..." : "Opprett"}
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-wine-400 hover:text-wine-600 transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
