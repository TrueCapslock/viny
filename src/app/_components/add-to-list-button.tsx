"use client"

import { useState } from "react"
import { PlaylistAdd } from "@/app/_components/icons"
import { AddToListDialog } from "./add-to-list-dialog"

export function AddToListButton({
  wineId,
  wineName,
  variant = "icon",
  label,
  className,
}: {
  wineId: number
  wineName: string
  variant?: "icon" | "pill"
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const defaultClass =
    variant === "pill"
      ? "bg-white shadow-lg shadow-wine-900/25 rounded-full px-4 py-2.5 text-sm font-semibold text-wine-700 hover:bg-cream-50 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
      : "text-wine-400 hover:text-wine-700 transition-colors p-2.5 rounded-full hover:bg-wine-50/80 flex items-center justify-center"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Legg i liste"
        aria-label="Legg i liste"
        className={className ?? defaultClass}
      >
        <PlaylistAdd className={variant === "pill" ? "w-5 h-5" : "w-4 h-4"} />
        {variant === "pill" && label && <span>{label}</span>}
      </button>
      {open && (
        <AddToListDialog wineId={wineId} wineName={wineName} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
