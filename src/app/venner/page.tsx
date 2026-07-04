"use client"

import { useState } from "react"
import Link from "next/link"
import { Users } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { UserCardSkeleton } from "@/app/_components/skeletons"
import { ShareMainlistDialog } from "@/app/_components/share-mainlist-dialog"
import { useFriends, useSuggestions } from "@/hooks/use-data"

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
}

// v0.15.1: list-share is invite-then-accept.
type PendingShareInviteSent = {
  id: number
  toUserId: number
  winner: "mine" | "theirs" | "merge"
  toUser: { id: number; name: string | null; email: string; image: string | null }
}
type PendingShareInviteReceived = {
  id: number
  fromUserId: number
  winner: "mine" | "theirs" | "merge"
  fromUser: { id: number; name: string | null; email: string; image: string | null }
}

export default function FriendsPage() {
  const { isBeer } = useBeerMode()
  const {
    friends,
    pendingSent,
    pendingReceived,
    pendingShareInvitesSent,
    pendingShareInvitesReceived,
    loading: friendsLoading,
    mutate: mutateFriends,
  } = useFriends()
  const { received: suggestions, loading: suggestionsLoading, mutate: mutateSuggestions } = useSuggestions()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserInfo[]>([])
  const [searching, setSearching] = useState(false)

  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareTarget, setShareTarget] = useState<Friend | null>(null)

  // v0.15.0: share logic moved into ShareMainlistDialog — the page only
  // toggles open/close and re-runs the friends SWR fetch on success.
  async function reload() {
    await Promise.all([mutateFriends(), mutateSuggestions()])
  }

  // v0.15.1: list-share actions.
  //
  // Accept runs the merge tx on the server (the friend user is
  // post-authenticated). Decline and cancel both DELETE the invite
  // with status="declined" or "cancelled" respectively; the route
  // differentiates by caller identity. We always reload() afterwards
  // so the new merged-state friend row (or the dismissed pending
  // invite row) shows up on the next SWR pass.
  async function handleAcceptShareInvite(inviteId: number) {
    const res = await fetch(`/api/friends/share-invite/${inviteId}/accept`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.error ?? "Kunne ikke godta delingen")
      return
    }
    await reload()
  }

  async function handleDeclineShareInvite(inviteId: number) {
    const res = await fetch(`/api/friends/share-invite/${inviteId}`, { method: "DELETE" })
    if (res.ok) mutateFriends()
  }

  async function handleCancelShareInvite(inviteId: number) {
    const res = await fetch(`/api/friends/share-invite/${inviteId}`, { method: "DELETE" })
    if (res.ok) mutateFriends()
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
      mutateFriends()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  async function handleAccept(friendshipId: number) {
    await fetch(`/api/friends/${friendshipId}`, { method: "PUT" })
    mutateFriends()
  }

  async function handleDecline(friendshipId: number) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
    mutateFriends()
  }

  async function handleAcceptSuggestion(suggestionId: number) {
    const res = await fetch(`/api/forslag/${suggestionId}/accept`, { method: "POST" })
    if (res.ok) reload()
  }

  async function handleDeclineSuggestion(suggestionId: number) {
    const res = await fetch(`/api/forslag/${suggestionId}`, { method: "DELETE" })
    if (res.ok) mutateSuggestions()
  }

  function openShareDialog(friend: Friend) {
    setShareTarget(friend)
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

  const loading = friendsLoading && suggestionsLoading

  if (loading) {
    return (
      <div className="flex-1 px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="h-7 w-24 bg-cream-200 animate-pulse rounded-md" />
          <div className="h-5 w-16 bg-cream-200 animate-pulse rounded-full" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-10 rounded-xl bg-cream-200 animate-pulse w-full" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-3 w-36 bg-cream-200 animate-pulse rounded mb-3" />
          <UserCardSkeleton />
          <UserCardSkeleton />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 bg-cream-200 animate-pulse rounded mb-3" />
          <UserCardSkeleton />
          <UserCardSkeleton />
          <UserCardSkeleton />
          <UserCardSkeleton />
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
            {pendingReceived.map((p: Pending) => (
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
            {pendingSent.map((p: Pending) => (
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
            {suggestions.map((s: Suggestion) => (
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

      {pendingShareInvitesReceived.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Delte-listeforespørsler</h2>
          <div className="space-y-2">
            {pendingShareInvitesReceived.map((i: PendingShareInviteReceived) => {
              const sender = i.fromUser
              const senderLabel = sender?.name ?? sender?.email ?? "en venn"
              // winner="merge" is the non-destructive path: all wines
              // survive. mine/theirs are now destructive — the loser's
              // wines are dropped on accept. Lookup map (not a nested
              // ternary) so TS catches an unhandled winner at compile
              // time and the copy is easier to scan.
              const subtitleByWinner: Record<
                PendingShareInviteReceived["winner"],
                string
              > = {
                merge: `${senderLabel} foreslår å slå sammen listene — alle viner bevares i den felles listen.`,
                mine: `Senderens liste blir den felles — ${senderLabel}s viner blir slettet.`,
                theirs: `Din liste blir den felles — dine viner blir slettet.`,
              }
              const subtitle = subtitleByWinner[i.winner]
              return (
                <div
                  key={i.id}
                  data-testid="share-invite-received"
                  className="bg-white rounded-xl border border-cream-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                      <Users className="w-5 h-5 text-wine-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-wine-800 truncate">
                        {senderLabel} vil dele {isBeer ? "ølliste" : "vinliste"} med deg
                      </p>
                      <p className="text-xs text-wine-500 mt-1 leading-relaxed">{subtitle}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAcceptShareInvite(i.id)}
                      data-testid="share-invite-accept"
                      className="rounded-full bg-wine-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-wine-700 transition-colors"
                    >
                      Godta
                    </button>
                    <button
                      onClick={() => handleDeclineShareInvite(i.id)}
                      data-testid="share-invite-decline"
                      className="rounded-full border border-cream-300 px-3.5 py-1.5 text-xs font-medium text-wine-600 hover:bg-cream-50 transition-colors"
                    >
                      Avslå
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pendingShareInvitesSent.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-wine-500 uppercase tracking-wider mb-3">Ventende delte-listeforespørsler</h2>
          <div className="space-y-2">
            {pendingShareInvitesSent.map((i: PendingShareInviteSent) => {
              const targetEmail = i.toUser?.email
              // Prefer the friend display name over their email for the
              // "blir slettet" copy — e.g. "Olas viner blir slettet"
              // rather than "e2e-merge-12345@viny.tests viner blir
              // slettet", which is ungrammatical Norwegian.
              const targetName =
                i.toUser?.name ?? i.toUser?.email ?? "vennen"
              const sentTail = targetEmail ? ` til ${targetEmail}` : ""
              const tailByWinner: Record<
                PendingShareInviteSent["winner"],
                string
              > = {
                merge:
                  "Venter på svar — listene slås sammen og alle viner bevares.",
                mine: `Venter på svar — ${targetName}s viner blir slettet ved godkjenning.`,
                theirs:
                  "Venter på svar — dine viner blir slettet ved godkjenning.",
              }
              return (
                <div
                  key={i.id}
                  data-testid="share-invite-sent"
                  className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <Users className="w-5 h-5 text-cream-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wine-800 truncate">
                      Sendt forespørsel om å dele {isBeer ? "ølliste" : "vinliste"}{sentTail}
                    </p>
                    <p className="text-xs text-wine-400 truncate">
                      {tailByWinner[i.winner]}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelShareInvite(i.id)}
                    data-testid="share-invite-cancel"
                    className="rounded-full border border-cream-300 px-3.5 py-1.5 text-xs font-medium text-wine-600 hover:bg-cream-50 transition-colors shrink-0"
                  >
                    Kanseller
                  </button>
                </div>
              )
            })}
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
            {friends.map((friend: Friend) => {
              // v0.15.1: row gets a tri-state share badge. sharedList
              // wins top billing; otherwise hide the "Del liste" button
              // when there's a pending sent invite to that friend so the
              // user doesn't double-invite.
              const pendingInviteToFriend = pendingShareInvitesSent.find(
                (i: PendingShareInviteSent) => i.toUserId === friend.userId,
              )
              return (
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
                      <span
                        data-testid="share-row-shared"
                        className="text-xs font-medium text-gold-600"
                      >
                        {isBeer ? "✓ Deler ølliste" : "✓ Deler vinliste"}
                      </span>
                    ) : pendingInviteToFriend ? (
                      <span
                        data-testid="share-row-pending"
                        className="text-xs font-medium text-wine-400"
                      >
                        {isBeer ? "Venter på svar om ølliste…" : "Venter på svar om vinliste…"}
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
              )
            })}
          </div>
        )}
      </section>

      {showShareDialog && shareTarget && (
        <ShareMainlistDialog
          friend={{
            userId: shareTarget.userId,
            name: shareTarget.name,
            email: shareTarget.email,
          }}
          onShared={() => {
            // The dialog calls onShared() THEN onClose() on success — so
            // let onClose own the state-reset (setShareTarget(null) +
            // setShowShareDialog(false)) and have onShared only kick the
            // SWR re-fetch. If we clear shareTarget here too, the
            // dialog's onClose call hits it again — redundant.
            mutateFriends()
          }}
          onClose={() => {
            setShareTarget(null)
            setShowShareDialog(false)
          }}
        />
      )}
    </div>
  )
}
