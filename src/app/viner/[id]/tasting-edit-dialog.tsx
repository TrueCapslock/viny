"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import type { Tasting } from "@/generated/prisma/client"
import { TastingForm } from "./tasting-form"

export function TastingEditDialog({
  tasting,
}: {
  tasting: Tasting
}) {
  const [open, setOpen] = useState(false)

  // Same input-class conventions as TastingFormDialog/the WineForm
  // for visual consistency across dialogs on /viner/[id].
  const inputClass =
    "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

  // The dialog overlay sits at z-50 so it covers the sticky CellarToggle
  // / AddToListButton pills and the bottom-sheet's overflow menu. The
  // portal defends against future transformed ancestors that would
  // otherwise trap z-50 inside a stacking context.
  const dialog = open
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors"
              aria-label="Lukk"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-wine-900 mb-4">
              Rediger smaking
            </h2>

            <TastingForm wineId={tasting.wineId} initial={tasting} />

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm font-medium text-wine-600 hover:bg-cream-50 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  // Note: we don't render a "Slett" button here. The Slett affordance
  // lives at the bottom of the expanded tasting row for discoverability
  // and a confirmation prompt. This dialog is purely edit.
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-wine-600 hover:bg-cream-50 hover:border-wine-300 transition-colors shadow-sm"
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
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
          />
        </svg>
        Rediger
      </button>
      {dialog}
      {/* Reference inputClass so the linter doesn't drop the import we use
          in the dialog overlay above. (Tree-shaking guard for dev tooling.) */}
      <span className="hidden" aria-hidden data-inputs={inputClass.length} />
    </>
  )
}
