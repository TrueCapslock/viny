"use client"

import { useState } from "react"
import type { Tasting } from "@/generated/prisma/client"
import { StaticStars } from "@/app/_components/star-rating"

export function TastingList({ tastings }: { tastings: Tasting[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => {
    if (tastings.length === 0) return {}
    const first = tastings[0]
    const firstHasContent = first.nose || first.palate || first.finish || first.foodPairing || first.pricePaid || first.comment
    return firstHasContent ? { [first.id]: true } : {}
  })

  function toggle(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (tastings.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-cream-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        const hasContent = tasting.nose || tasting.palate || tasting.finish || tasting.foodPairing || tasting.pricePaid || tasting.comment
        return (
          <div
            key={tasting.id}
            className="rounded-xl border border-cream-200 bg-cream-50/50 transition-all hover:border-cream-300"
          >
            {hasContent ? (
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
                  {tasting.rating ? <StaticStars rating={tasting.rating} /> : null}
                  {tasting.location && (
                    <span className="text-xs text-wine-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <time className="text-xs font-medium text-wine-400">
                  {new Date(tasting.date).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                {tasting.rating ? <StaticStars rating={tasting.rating} /> : null}
                {tasting.location && (
                  <span className="text-xs text-wine-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {tasting.location}
                  </span>
                )}
              </div>
            )}

            {isOpen && hasContent && (
              <div className="px-4 pb-4 pt-0 border-t border-cream-200/80 animate-fade-in">
                <div className="space-y-2.5 text-sm text-wine-800 mt-3">
                  {tasting.nose && (
                    <div>
                      <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">Duft</span>
                      <p className="mt-0.5 leading-relaxed">{tasting.nose}</p>
                    </div>
                  )}
                  {tasting.palate && (
                    <div>
                      <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">Smak</span>
                      <p className="mt-0.5 leading-relaxed">{tasting.palate}</p>
                    </div>
                  )}
                  {tasting.finish && (
                    <div>
                      <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">Ettersmak</span>
                      <p className="mt-0.5 leading-relaxed">{tasting.finish}</p>
                    </div>
                  )}
                  {tasting.foodPairing && (
                    <div>
                      <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">Mat</span>
                      <p className="mt-0.5 leading-relaxed">{tasting.foodPairing}</p>
                    </div>
                  )}
                  {tasting.comment && (
                    <div>
                      <span className="text-[10px] font-semibold text-wine-400 uppercase tracking-widest">Notater</span>
                      <p className="mt-0.5 leading-relaxed whitespace-pre-wrap">{tasting.comment}</p>
                    </div>
                  )}
                  {tasting.pricePaid && (
                    <div className="flex items-center gap-1 text-xs text-wine-400 mt-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {tasting.pricePaid} kr
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
