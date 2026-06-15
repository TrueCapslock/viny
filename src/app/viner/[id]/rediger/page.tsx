"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WineForm } from "@/app/_components/wine-form"

type FormData = {
  name: string
  producer: string
  vintage: string
  varietal: string
  region: string
  country: string
  type: string
  notes: string
}

export default function EditWinePage() {
  const { id } = useParams<{ id: string }>()
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
        })
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 bg-wine-gradient-light flex items-center justify-center">
        <p className="text-wine-400">Laster...</p>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="flex-1 bg-wine-gradient-light flex items-center justify-center">
        <p className="text-wine-400">Fant ikke vinen</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-wine-gradient-light">
      <WineForm
        initial={initial}
        saveLabel="Lagre endringer"
        onSave={async (data) => {
          const res = await fetch(`/api/viner/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          return { ok: res.ok }
        }}
      />
    </div>
  )
}
