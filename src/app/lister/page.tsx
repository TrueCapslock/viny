"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lists, Plus } from "@/app/_components/icons"
import { ModeLogo, ModeText } from "@/app/_components/mode-text"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { useLists } from "@/hooks/use-data"

export default function ListerPage() {
  const { isBeer } = useBeerMode()
  const router = useRouter()
  const { lists, loading, mutate } = useLists()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")

  async function createList() {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setCreating(false)
    if (res.ok) {
      const list = await res.json()
      mutate([list, ...lists], false)
      setName("")
      router.push(`/lister/${list.id}`)
    }
  }

  async function deleteList(listId: number) {
    if (!confirm("Slette denne listen? Vinene i den blir ikke slettet, bare koblingen til listen.")) return
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" })
    if (res.ok) {
      mutate(lists.filter((l) => l.id !== listId), false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-10 relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/15 rounded-xl p-1.5">
            <Lists className="w-5 h-6 text-gold-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lister</h1>
            <p className="text-wine-200 text-sm">
              Organiser {isBeer ? "øl" : "vin"} i dine egne lister
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-24 space-y-3">
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-3 mt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createList()
            }}
            className="flex items-center gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBeer ? "Ny ølliste..." : "Ny vinliste..."}
              className="flex-1 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="rounded-xl bg-wine-600 text-white px-4 py-2 text-sm font-medium hover:bg-wine-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-6 h-6" />
              {creating ? "..." : "Opprett"}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-sm text-wine-400 text-center py-8">Laster...</div>
        ) : lists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-8 shadow-sm text-center">
            <ModeLogo className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-wine-700 font-semibold">Ingen lister ennå</p>
            <p className="text-sm text-wine-500 mt-1">
              Opprett en liste for å samle <ModeText wine="favorittvinene" beer="favorittølene" /> dine.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-cream-200 shadow-sm divide-y divide-cream-100">
            {lists.map((list) => {
              const count = list._count?.wines ?? 0
              return (
                <div key={list.id} className="flex items-center gap-2 p-4">
                  <Link href={`/lister/${list.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-wine-900 truncate">{list.name}</p>
                    <p className="text-xs text-wine-500 mt-0.5">
                      {count} {count === 1 ? (isBeer ? "øl" : "vin") : isBeer ? "øl" : "viner"}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteList(list.id)}
                    title="Slett liste"
                    aria-label="Slett liste"
                    className="text-wine-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
