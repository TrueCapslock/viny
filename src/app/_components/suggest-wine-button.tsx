"use client"

import { useState } from "react"
import { SuggestWineDialog } from "./suggest-wine-dialog"

export function SuggestWineButton({ wineId, wineName }: { wineId: number; wineName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-wine-600 hover:text-wine-800 transition-colors px-3.5 py-1.5 rounded-xl hover:bg-wine-50"
      >
        Foreslå
      </button>
      {open && <SuggestWineDialog wineId={wineId} wineName={wineName} onClose={() => setOpen(false)} />}
    </>
  )
}
