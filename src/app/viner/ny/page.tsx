"use client"

import { useState } from "react"
import { WineForm } from "@/app/_components/wine-form"
import { VinmonopoletSearch } from "@/app/_components/vinmonopolet-search"
import { Grape } from "@/app/_components/icons"

type Prefill = {
  name: string
  producer: string
}

export default function NewWinePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [showForm, setShowForm] = useState(false)

  function handleSelect(product: { productId: string; productShortName: string }) {
    if (!product.productId) {
      setSelectedId(null)
      setPrefill(null)
      setShowForm(false)
      return
    }
    setSelectedId(product.productId)
    const parts = product.productShortName.split(" ")
    const producer = parts.length > 1 ? parts.slice(0, Math.min(3, parts.length - 1)).join(" ") : ""
    setPrefill({ name: product.productShortName, producer })
    setShowForm(true)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <Grape className="w-6 h-7 text-gold-300/60" />
          <div>
            <h1 className="text-xl font-bold">Ny vin</h1>
            <p className="text-wine-200 text-sm">Søk etter vin eller fyll inn manuelt</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24">
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <VinmonopoletSearch selectedId={selectedId} onSelect={handleSelect} />
        </div>

        {!showForm && (
          <p className="text-xs text-wine-400 mt-3 px-1">
            Søk i Vinmonopolets sortiment eller fyll inn skjemaet under.
          </p>
        )}

        <div
          className={`mt-4 transition-all duration-300 ${
            showForm ? "opacity-100 translate-y-0" : ""
          }`}
        >
          <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
            <WineForm
              key={prefill ? `${prefill.name}-${prefill.producer}` : "empty"}
              initial={
                prefill
                  ? {
                      name: prefill.name,
                      producer: prefill.producer,
                      vintage: "",
                      varietal: "",
                      region: "",
                      country: "",
                      type: "",
                      notes: "",
                    }
                  : undefined
              }
              onSave={async (data) => {
                const res = await fetch("/api/viner", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                })
                if (!res.ok) {
                  const text = await res.text()
                  return { ok: false, error: text }
                }
                return { ok: true }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
