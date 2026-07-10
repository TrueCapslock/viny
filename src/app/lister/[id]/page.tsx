"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { fetcher } from "@/lib/api"
import useSWR, { mutate } from "swr"
import { Lists } from "@/app/_components/icons"
import { ModeLogo, ModeText } from "@/app/_components/mode-text"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { WineCard, type WineCardData } from "@/app/_components/wine-card"


type ListDetail = {
  id: number
  name: string
  wines: {
    addedAt: string
    wine: {
      id: number
      name: string
      producer: string
      vintage: number | null
      image: string | null
      type: string | null
      country: string | null
      inCellar: boolean
      tastings: { rating: number | null }[]
      quantity: number | null
      _count: { tastings: number }
    }
  }[]
}

export default function ListDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isBeer } = useBeerMode()
  const listId = parseInt(params.id)
  const { data, error, isLoading, mutate: mutateList } = useSWR<ListDetail>(`/api/lists/${listId}`, fetcher)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  useEffect(() => {
    if (data?.name) setName(data.name)
  }, [data?.name])

  async function saveRename() {
    if (!data) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === data.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setSaving(false)
    if (res.ok) {
      mutateList({ ...data, name: trimmed }, false)
      setEditing(false)
    }
  }

  async function removeWine(wineId: number) {
    setRemovingId(wineId)
    await fetch(`/api/viner/${wineId}/lists/${listId}`, { method: "DELETE" })
    if (data) {
      mutateList(
        { ...data, wines: data.wines.filter((w) => w.wine.id !== wineId) },
        false,
      )
    }
    setRemovingId(null)
  }

  async function deleteList() {
    if (!data) return
    if (!confirm("Slette denne listen? Vinene i den blir ikke slettet.")) return
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" })
    if (res.ok) {
      // Trigger a /api/lists revalidation via SWR's global mutate.
      // Without this, /lister's SWR cache still holds the just-deleted
      // list and renders it instead of the empty state.
      await mutate("/api/lists")
      router.push("/lister")
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <p className="text-wine-400 text-sm">Laster...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-wine-gradient text-white px-4 pt-1 pb-10 relative">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/lister"
              className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tilbake
            </Link>
          </div>
        </div>
        <div className="flex-1 px-4 -mt-4 pb-24 flex items-center justify-center">
          <p className="text-wine-400">Fant ikke listen.</p>
        </div>
      </div>
    )
  }

  const count = data.wines.length

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10 relative">
        <Link
          href="/lister"
          className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake til lister
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename()
                  if (e.key === "Escape") {
                    setEditing(false)
                    setName(data.name)
                  }
                }}
                onBlur={saveRename}
                autoFocus
                className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-xl font-bold text-white placeholder-wine-200 focus:border-white/60 focus:ring-1 focus:ring-white/60 outline-none"
              />
            ) : (
              <h1
                className="text-2xl font-bold tracking-tight text-white cursor-text"
                onClick={() => setEditing(true)}
                title="Klikk for å gi nytt navn"
              >
                {data.name}
              </h1>
            )}
            <p className="text-wine-200/90 mt-1 text-sm">
              {count} {count === 1 ? (isBeer ? "øl" : "vin") : isBeer ? "øl" : "viner"}
            </p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 shrink-0">
            <Lists className="w-6 h-7 text-gold-300" />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 hover:bg-white/20 transition-colors"
          >
            Gi nytt navn
          </button>
          <button
            type="button"
            onClick={deleteList}
            className="text-xs px-3 py-1 rounded-full bg-white/15 text-wine-100 border border-white/10 hover:bg-white/20 transition-colors"
          >
            Slett liste
          </button>
          {saving && <span className="text-xs text-wine-200 self-center">Lagrer...</span>}
        </div>
      </div>

      <div className="flex-1 px-4 mt-4 pb-24 space-y-3">
        {count === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-8 shadow-sm text-center">
            <ModeLogo className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-wine-700 font-semibold">Tom liste</p>
            <p className="text-sm text-wine-500 mt-1">
              Legg til <ModeText wine="vin" beer="øl" /> fra en hvilken som helst <ModeText wine="vin" beer="øl" />side for å fylle listen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.wines.map(({ wine }) => {
              const card: WineCardData = {
                id: wine.id,
                name: wine.name,
                producer: wine.producer,
                vintage: wine.vintage,
                image: wine.image,
                type: wine.type,
                country: wine.country,
                inCellar: wine.inCellar,
                quantity: wine.quantity,
                avgRating: wine.tastings[0]?.rating ?? null,
                tastingCount: wine._count.tastings,
              }
              return (
                <div
                  key={wine.id}
                  className={`transition-opacity ${removingId === wine.id ? "opacity-50" : ""}`}
                >
                  <WineCard
                    wine={card}
                    from={`/lister/${listId}`}
                    topRightSlot={
                      <button
                        type="button"
                        onClick={() => removeWine(wine.id)}
                        disabled={removingId === wine.id}
                        title="Fjern fra liste"
                        aria-label="Fjern fra liste"
                        className="text-wine-400 hover:text-red-600 transition-colors p-1.5 rounded-full bg-white/80 hover:bg-red-50 backdrop-blur-sm shadow-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
