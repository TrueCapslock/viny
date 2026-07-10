"use client"

import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export function WineApiLoginDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors z-10"
          aria-label="Lukk"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-wine-900 mb-4">Logg inn på wineapi.io</h2>
        <div className="w-full h-[500px] rounded-xl overflow-hidden border border-cream-200">
          <iframe
            src="https://wineapi.io/login"
            className="w-full h-full"
            title="wineapi.io login"
          />
        </div>
      </div>
    </div>
  )

  return mounted ? createPortal(dialog, document.body) : null
}
