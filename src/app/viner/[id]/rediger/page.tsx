"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { WineForm } from "@/app/_components/wine-form"
import { Grape } from "@/app/_components/icons"

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
}

export default function EditWinePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/viner/${id}`)
      .then((r) => r.json())
      .then((wine) => {
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
        })
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-wine-400">Laster...</p>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-wine-400">Fant ikke vinen</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-8">
        <Link href={`/viner/${id}`} className="inline-flex items-center gap-1 text-sm text-wine-200 hover:text-white transition-colors mb-3">
          &larr; Tilbake
        </Link>
        <div className="flex items-center gap-3">
          <Grape className="w-6 h-7 text-gold-300/60" />
          <h1 className="text-xl font-bold">Rediger vin</h1>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24">
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
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
