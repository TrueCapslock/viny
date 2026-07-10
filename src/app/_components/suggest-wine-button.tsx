"use client"

import { useState } from "react"
import { Share } from "@/app/_components/icons"
import { SuggestWineDialog } from "./suggest-wine-dialog"

export function SuggestWineButton({
  wineId,
  wineName,
  variant = "text",
  className,
}: {
  wineId: number
  wineName: string
  variant?: "text" | "icon"
  className?: string
}) {
  const [open, setOpen] = useState(false)

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Foreslå"
          aria-label="Foreslå"
          aria-haspopup="dialog"
          className={
            className ??
            "inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/45 active:bg-black/55 backdrop-blur-sm transition-all duration-200 ease-out text-white hover:scale-105 active:scale-95"
          }
        >
          <Share size={20} className="text-white" />
        </button>
        {open && <SuggestWineDialog wineId={wineId} wineName={wineName} onClose={() => setOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "text-sm font-medium text-wine-600 hover:text-wine-800 transition-colors px-3.5 py-1.5 rounded-xl hover:bg-wine-50"
        }
      >
        Foreslå
      </button>
      {open && <SuggestWineDialog wineId={wineId} wineName={wineName} onClose={() => setOpen(false)} />}
    </>
  )
}
