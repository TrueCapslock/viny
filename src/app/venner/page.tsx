"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, Grape } from "@/app/_components/icons"

type UserInfo = { id: number; name: string | null; email: string; image: string | null }
type Friend = UserInfo & { id: number; userId: number; canEdit: boolean }
type Pending = { id: number; userId: number; name: string | null; email: string; image: string | null; direction: "sent" | "received" }

export default function FriendsPage() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingSent, setPendingSent] = useState<Pending[]>([])
  const [pendingReceived, setPendingReceived] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserInfo[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch("/api/friends")
    const data = await res.json()
    setFriends(data.friends)
    setPendingSent(data.pendingSent)
    setPendingReceived(data.pendingReceived)
    setLoading(false)
  }

  async function handleRequest(email: string) {
    if (!email) return
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setSearchQuery("")
      setSearchResults([])
      load()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  async function handleAccept(friendshipId: number) {
    await fetch(`/api/friends/${friendshipId}`, { method: "PUT" })
    load()
  }

  async function handleDecline(friendshipId: number) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
    load()
  }

  async function handleRemove(friendshipId: number) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
    load()
  }

  async function handleToggleShare(friendUserId: number, currentlyShared: boolean) {
    if (currentlyShared) {
      await fetch("/api/friends/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      })
    } else {
      await fetch("/api/friends/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      })
    }
    load()
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSearchResults(data)
    setSearching(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-wine-200 border-t-wine-600 rounded-full animate-spin mx-auto" />
          <p className="text-wine-400 text-sm mt-3">Laster...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 px-4 pt-4 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-wine-900 tracking-tight">Venner</h1>
        <span className="text-xs font-medium text-wine-400 bg-wine-50 border border-wine-100 rounded-full px-3 py-1">
          {friends.length} {friends.length === 1 ? "venn" : "venner"}
        </span>
      </div>

      <div className="space-y-2 mb-6">
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Søk etter bruker på e-post eller navn..."
            className="w-full rounded-xl border border-cream-200 bg-white pl-10 pr-4 py-2.5 text-sm text-wine-900 placeholder-wine-400 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none shadow-sm transition-all"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleRequest(user.email)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-wine-800 hover:bg-cream-50 transition-colors border-b border-cream-100 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-4 h-4 text-wine-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name ?? "Ukjent"}</p>
                  <p className="text-xs text-wine-400 truncate">{user.email}</p>
                </div>
                <span className="text-xs font-medium text-wine-600 shrink-0">Legg til</span>
              </button>
            ))}
          </div>
        )}
        {searching && <p className="text-xs text-wine-400">Søker...</p>}
      </div>

      {pendingReceived.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Venneforespørsler</h2>
          <div className="space-y-2">
            {pendingReceived.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-wine-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wine-800 truncate">{p.name ?? p.email}</p>
                  <p className="text-xs text-wine-400 truncate">{p.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(p.id)}
                    className="rounded-full bg-wine-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-wine-700 transition-colors"
                  >
                    Godta
                  </button>
                  <button
                    onClick={() => handleDecline(p.id)}
                    className="rounded-full border border-cream-300 px-3.5 py-1.5 text-xs font-medium text-wine-600 hover:bg-cream-50 transition-colors"
                  >
                    Avslå
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingSent.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Ventende forespørsler</h2>
          <div className="space-y-2">
            {pendingSent.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-cream-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wine-800 truncate">{p.name ?? p.email}</p>
                  <p className="text-xs text-wine-400 truncate">{p.email}</p>
                </div>
                <span className="text-xs text-wine-400 shrink-0">Venter...</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">
          Dine venner
          {friends.length === 0 && " — legg til venner for å se deres viner"}
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-wine-50 border border-wine-100 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-wine-300" />
            </div>
            <p className="text-wine-500 text-sm mt-3">Ingen venner ennå</p>
            <p className="text-wine-400 text-xs mt-1">Søk etter brukere ovenfor</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white rounded-xl border border-cream-200 overflow-hidden">
                <Link
                  href={`/venner/${friend.userId}`}
                  className="flex items-center gap-3 p-4 hover:bg-cream-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {friend.image ? (
                      <img src={friend.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-wine-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wine-800 truncate">{friend.name ?? friend.email}</p>
                    <p className="text-xs text-wine-400 truncate">{friend.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-wine-400">
                      {friend.canEdit ? "Redigering" : "Les"}
                    </span>
                    <svg className="w-4 h-4 text-wine-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                <div className="px-4 pb-3 pt-0">
                  <button
                    onClick={() => handleToggleShare(friend.userId, friend.canEdit)}
                    className={`text-xs font-medium transition-colors ${
                      friend.canEdit
                        ? "text-wine-500 hover:text-wine-700"
                        : "text-wine-400 hover:text-wine-600"
                    }`}
                  >
                    {friend.canEdit ? "Fjern redigeringstilgang" : "Gi redigeringstilgang"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
