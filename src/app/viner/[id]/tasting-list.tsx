"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Tasting } from "@/generated/prisma/client"
import { StaticStars } from "@/app/_components/star-rating"
import { TastingEditDialog } from "./tasting-edit-dialog"

export function TastingList({
  tastings,
  canEdit,
}: {
  tastings: Tasting[]
  canEdit: boolean
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const router = useRouter()

  function toggle(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function deleteTasting(id: number) {
    // Window confirm() is intentionally low-fidelity for a destructive
    // low-stakes action. Removes the tasting row outright; the Wine
    // survives (the FK goes Cascade on Wine delete but DELETE on
    // Tasting.id never touches Wine).
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slett denne smakingen? Handlingen kan ikke angres.")
    ) {
      return
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/api/smaking/${id}`, { method: "DELETE" })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (tastings.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center mx-auto">
          <svg
            className="w-6 h-6 text-cream-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-wine-400 mt-3">Ingen smaksnotater ennå</p>
        <p className="text-xs text-wine-300 mt-1">Legg til din første smaking over</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tastings.map((tasting) => {
        const isOpen = expanded[tasting.id] ?? false
        const isDeleting = deletingId === tasting.id
        const hasContent =
          tasting.nose ||
          tasting.palate ||
          tasting.finish ||
          tasting.foodPairing ||
          tasting.pricePaid ||
          tasting.comment
        return (
          <div
            key={tasting.id}
            className="rounded-xl border border-cream-200 bg-cream-50/50 transition-all hover:border-cream-300"
          >
            {/*
             * The header is ALWAYS a clickable button, in both hasContent
             * and !hasContent cases. The previous version rendered a
             * non-interactive <div> when hasContent was false (typical for
             * a rating-only tasting the user wanted to annotate), which
             * meant the row couldn't expand and the Edit/Slett buttons
             * inside the body were unreachable. Keeping everything in
             * one branch also removes a ~50-line duplication.
             */}
            <button
              type="button"
              onClick={() => toggle(tasting.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <time className="text-xs font-medium text-wine-400">
                  {new Date(tasting.date).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                {tasting.rating ? (
                  <StaticStars rating={tasting.rating} />
                ) : null}
                {tasting.location && (
                  <span className="text-xs text-wine-400 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    {tasting.location}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-wine-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-0 border-t border-cream-200/80 animate-fade-in">
                {hasContent ? (
                  <div className="space-y-2.5 text-sm text-wine-800 mt-3">
                    {tasting.nose && (
                      <div>
                        <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">
                          Duft
                        </span>
                        <p className="mt-0.5 leading-relaxed">{tasting.nose}</p>
                      </div>
                    )}
                    {tasting.palate && (
                      <div>
                        <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">
                          Smak
                        </span>
                        <p className="mt-0.5 leading-relaxed">{tasting.palate}</p>
                      </div>
                    )}
                    {tasting.finish && (
                      <div>
                        <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">
                          Ettersmak
                        </span>
                        <p className="mt-0.5 leading-relaxed">{tasting.finish}</p>
                      </div>
                    )}
                    {tasting.foodPairing && (
                      <div>
                        <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">
                          Mat
                        </span>
                        <p className="mt-0.5 leading-relaxed">
                          {tasting.foodPairing}
                        </p>
                      </div>
                    )}
                    {tasting.comment && (
                      <div>
                        <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">
                          Notater
                        </span>
                        <p className="mt-0.5 leading-relaxed whitespace-pre-wrap">
                          {tasting.comment}
                        </p>
                      </div>
                    )}
                    {tasting.pricePaid && (
                      <div className="flex items-center gap-1 text-xs text-wine-400 mt-2">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {tasting.pricePaid} kr
                      </div>
                    )}
                  </div>
                ) : (
                  // hasContent=false (typical for rating-only log entries
                  // the user wants to annotate). Surface the empty state
                  // with a gentle prompt to open the edit dialog so the
                  // row doesn't feel broken on first expand.
                  <p className="mt-3 text-xs text-wine-400 italic">
                    Ingen notater ennå — klikk Rediger for å legge til detaljer.
                  </p>
                )}

                {/*
                 * Edit + delete live INSIDE the expanded body, NOT in
                 * the header, to avoid:
                 *   1) nested <button>-in-<button> HTML abuse,
                 *   2) `stopPropagation()` ceremony on mobile where a
                 *      tap on the edit icon would otherwise toggle
                 *      expansion as well.
                 * Calmer, less crowded, and the affordances read as
                 * "things you can do with this tasting row".
                 */}
                {canEdit && (
                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-cream-200/60">
                    <TastingEditDialog tasting={tasting} />
                    <button
                      type="button"
                      onClick={() => deleteTasting(tasting.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-wine-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.166L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      {isDeleting ? "Sletter..." : "Slett"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
