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

  function handleSelect(product: { productId: string; productShortName: string }) {
    if (!product.productId) {
      setSelectedId(null)
      setPrefill(null)
      return
    }
    setSelectedId(product.productId)
    const parts = product.productShortName.split(" ")
    const producer = parts.length > 1 ? parts.slice(0, Math.min(3, parts.length - 1)).join(" ") : ""
    setPrefill({ name: product.productShortName, producer })
  }

  return (
    <div className="flex-1 bg-wine-gradient-light">
      <div className="bg-wine-gradient text-white">
        <div className="max-w-xl mx-auto px-4 py-8 pb-12">
          <div className="flex items-center gap-3">
            <Grape className="w-8 h-10 text-gold-300/60" />
            <div>
              <h1 className="text-2xl font-bold">Ny vin</h1>
              <p className="text-wine-200 text-sm mt-0.5">Søk og fyll inn detaljer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-6 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-4 mb-6">
          <VinmonopoletSearch selectedId={selectedId} onSelect={handleSelect} />
        </div>

        <p className="text-xs text-wine-400 mb-4 px-1">
          Søk etter vin i Vinmonopolets sortiment for å forhåndsutfylle skjemaet.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-6">
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
              return { ok: res.ok }
            }}
          />
        </div>
      </div>
    </div>
  )
}
