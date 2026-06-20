"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { WineForm } from "@/app/_components/wine-form"
import { Grape } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { useWineDetail } from "@/hooks/use-data"
import { FormSkeleton } from "@/app/_components/skeletons"

type FormData = {
  name: string
  producer: string
  vintage: string
  varietal: string
  region: string
  country: string
  type: string
  notes: string
  image: string
  inCellar: boolean
  quantity: string
}

export default function EditWinePage() {
  const { isBeer } = useBeerMode()
  const { id } = useParams<{ id: string }>()
  const { wine, loading } = useWineDetail(parseInt(id))
  const [initial, setInitial] = useState<FormData | null>(null)

  useEffect(() => {
    if (wine) {
      setInitial({
        name: wine.name,
        producer: wine.producer,
        vintage: wine.vintage?.toString() ?? "",
        varietal: wine.varietal ?? "",
        region: wine.region ?? "",
        country: wine.country ?? "",
        type: wine.type ?? "",
        notes: wine.notes ?? "",
        image: wine.image ?? "",
        inCellar: wine.inCellar ?? false,
        quantity: wine.quantity?.toString() ?? "0",
      })
    }
  }, [wine])

  if (loading && !initial) {
    return <FormSkeleton />
  }

  if (!initial) {
    return (
      <div className="flex-1 flex items-center justify-center">
          <p className="text-wine-400">{isBeer ? "Fant ikke ølet" : "Fant ikke vinen"}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10">
        <Link href={`/viner/${id}`} className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-white/15 rounded-xl p-1.5">
            <Grape className="w-5 h-6 text-gold-300" />
          </div>
          <h1 className="text-xl font-bold">{isBeer ? "Rediger øl" : "Rediger vin"}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24">
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
          <WineForm
            initial={initial}
            saveLabel="Lagre endringer"
            warnOnUnsavedChanges
            onSave={async (data) => {
              const res = await fetch(`/api/viner/${id}`, {
                method: "PUT",
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
  )
}
