"use client"

import { useState } from "react"
import { PlaylistAdd } from "@/app/_components/icons"
import { AddToListDialog } from "./add-to-list-dialog"

export function AddToListButton({ wineId, wineName }: { wineId: number; wineName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Legg i liste"
        aria-label="Legg i liste"
        className="text-wine-400 hover:text-wine-700 transition-colors p-2.5 rounded-full hover:bg-wine-50/80 flex items-center justify-center"
      >
        <PlaylistAdd className="w-4 h-4" />
      </button>
      {open && (
        <AddToListDialog wineId={wineId} wineName={wineName} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
