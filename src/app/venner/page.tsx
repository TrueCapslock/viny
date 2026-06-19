"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type UserInfo = { id: number; name: string | null; email: string; image: string | null }
type Friend = UserInfo & { id: number; userId: number; sharedList: boolean }
type Pending = { id: number; userId: number; name: string | null; email: string; image: string | null; direction: "sent" | "received" }

type Suggestion = {
  id: number
  name: string
  producer: string
  vintage: number | null
  varietal: string | null
  notes: string | null
  message: string | null
  fromUser: { id: number; name: string | null; email: string; image: string | null }
  toUser?: { id: number; name: string | null; email: string; image: string | null }
}

export default function FriendsPage() {
  const { isBeer } = useBeerMode()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingSent, setPendingSent] = useState<Pending[]>([])
  const [pendingReceived, setPendingReceived] = useState<Pending[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [sentSuggestions, setSentSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserInfo[]>([])
  const [searching, setSearching] = useState(false)

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareTarget, setShareTarget] = useState<Friend | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [friendsRes, forslagRes] = await Promise.all([
      fetch("/api/friends"),
      fetch("/api/forslag"),
    ])
    const friendsData = await friendsRes.json()
    const forslagData = await forslagRes.json()
    setFriends(friendsData.friends)
    setPendingSent(friendsData.pendingSent)
    setPendingReceived(friendsData.pendingReceived)
    setSuggestions(forslagData.received)
    setSentSuggestions(forslagData.sent)
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

  async function handleShare(mode: "mine" | "theirs" | "merge") {
    if (!shareTarget) return
    setSharing(true)
    setShareError(null)
    const res = await fetch("/api/shared-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId: shareTarget.userId, mode }),
    })
    if (res.ok) {
      setShowShareDialog(false)
      setShareTarget(null)
      load()
    } else {
      const data = await res.json()
      setShareError(data.error ?? "Noe gikk galt")
    }
    setSharing(false)
  }

  async function handleAcceptSuggestion(suggestionId: number) {
    const res = await fetch(`/api/forslag/${suggestionId}/accept`, { method: "POST" })
    if (res.ok) load()
  }

  async function handleDeclineSuggestion(suggestionId: number) {
    const res = await fetch(`/api/forslag/${suggestionId}`, { method: "DELETE" })
    if (res.ok) load()
  }

  async function handleCancelSuggestion(suggestionId: number) {
    const res = await fetch(`/api/forslag/${suggestionId}`, { method: "DELETE" })
    if (res.ok) load()
  }

  function openShareDialog(friend: Friend) {
    setShareTarget(friend)
    setShareError(null)
    setShowShareDialog(true)
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

      {suggestions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">{isBeer ? "Ølforslag" : "Vinforslag"}</h2>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-cream-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.fromUser.image ? (
                      <img src={s.fromUser.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-wine-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wine-800">
                      {s.name}
                    </p>
                    <p className="text-xs text-wine-500">
                      {s.producer}{s.vintage ? `, ${s.vintage}` : ""}
                    </p>
                    <p className="text-xs text-wine-400 mt-1">
                      Foreslått av {s.fromUser.name ?? s.fromUser.email}
                    </p>
                    {s.message && (
                      <p className="text-xs text-wine-500 mt-1.5 bg-cream-50 rounded-lg px-3 py-2 italic">
                        &ldquo;{s.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAcceptSuggestion(s.id)}
                    className="rounded-full bg-wine-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-wine-700 transition-colors"
                  >
                    Legg til i min liste
                  </button>
                  <button
                    onClick={() => handleDeclineSuggestion(s.id)}
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

      {sentSuggestions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Sendte forslag</h2>
          <div className="space-y-2">
            {sentSuggestions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-cream-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wine-800">{s.name}</p>
                    <p className="text-xs text-wine-500">
                      {s.producer}{s.vintage ? `, ${s.vintage}` : ""}
                    </p>
                    <p className="text-xs text-wine-400 mt-1">
                      Til: {s.toUser?.name ?? s.toUser?.email ?? "Ukjent"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCancelSuggestion(s.id)}
                    className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Trekk tilbake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">
          Dine venner
          {friends.length === 0 && (isBeer ? " — legg til venner for å se deres øl" : " — legg til venner for å se deres viner")}
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
                      {friend.sharedList ? "Felles liste" : "Les"}
                    </span>
                    <svg className="w-4 h-4 text-wine-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                <div className="px-4 pb-3 pt-0">
                  {friend.sharedList ? (
                    <span className="text-xs font-medium text-gold-600">
                      {isBeer ? "✓ Deler ølliste" : "✓ Deler vinliste"}
                    </span>
                  ) : (
                    <button
                      onClick={() => openShareDialog(friend)}
                      className="text-xs font-medium text-wine-600 hover:text-wine-800 transition-colors"
                    >
                      Del liste
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showShareDialog && shareTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowShareDialog(false)}
              className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-wine-900 mb-1">{isBeer ? "Del ølliste" : "Del vinliste"}</h2>
            <p className="text-sm text-wine-500 mb-5">
              Velg hva som skal deles med <span className="font-medium text-wine-700">{shareTarget.name ?? shareTarget.email}</span>
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleShare("mine")}
                disabled={sharing}
                className="w-full text-left rounded-xl border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-wine-800">Del din liste</p>
                <p className="text-xs text-wine-500 mt-0.5">{isBeer ? "Vennene får tilgang til dine øl. Dere kan begge redigere." : "Vennene får tilgang til dine viner. Dere kan begge redigere."}</p>
              </button>
              <button
                onClick={() => handleShare("theirs")}
                disabled={sharing}
                className="w-full text-left rounded-xl border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-wine-800">Del vennens liste</p>
                <p className="text-xs text-wine-500 mt-0.5">{isBeer ? "Du får tilgang til vennens øl. Dere kan begge redigere." : "Du får tilgang til vennens viner. Dere kan begge redigere."}</p>
              </button>
              <button
                onClick={() => handleShare("merge")}
                disabled={sharing}
                className="w-full text-left rounded-xl border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-wine-800">Slå sammen</p>
                <p className="text-xs text-wine-500 mt-0.5">Begge listene slås sammen til én felles liste. Dere kan begge redigere.</p>
              </button>
            </div>

            {sharing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-wine-500">
                <div className="w-4 h-4 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
                Oppretter felles liste...
              </div>
            )}

            {shareError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mt-4">
                {shareError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
