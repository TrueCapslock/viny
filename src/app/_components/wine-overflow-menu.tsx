"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Icon } from "@/app/_components/icons"
import { DeleteButton } from "@/app/_components/delete-button"

export function WineOverflowMenu({
  wineId,
  wineName,
  tastingCount,
}: {
  wineId: number
  wineName: string
  tastingCount: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Mer"
        aria-label="Mer"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/45 backdrop-blur-sm transition-colors text-white"
      >
        <Icon name="more_horiz" size={20} className="text-white" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-white rounded-2xl border border-cream-200 shadow-xl shadow-wine-900/20 p-1.5 animate-fade-in"
        >
          <Link
            role="menuitem"
            href={`/viner/${wineId}/rediger`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-wine-700 hover:bg-cream-50 rounded-xl transition-colors"
          >
            <Icon name="edit" size={18} className="text-wine-500" />
            Rediger
          </Link>
          <div role="none">
            <DeleteButton wineId={wineId} wineName={wineName} tastingCount={tastingCount} />
          </div>
        </div>
      )}
    </div>
  )
}
