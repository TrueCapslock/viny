"use client"

import { useState, useEffect } from "react"
import { Users } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type Friend = { userId: number; name: string | null; email: string }

export function SuggestWineDialog({
  wineId,
  wineName,
  onClose,
}: {
  wineId: number
  wineName: string
  onClose: () => void
}) {
  const { isBeer } = useBeerMode()
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => setFriends(data.friends))
  }, [])

  async function handleSend() {
    if (!selectedFriend) return
    setSending(true)
    setError(null)
    const res = await fetch("/api/forslag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: selectedFriend, wineId, message: message || undefined }),
    })
    if (res.ok) {
      setSent(true)
    } else {
      const data = await res.json()
      setError(data.error ?? "Noe gikk galt")
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-wine-400 hover:text-wine-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-wine-800">Forslag sendt!</p>
            <p className="text-xs text-wine-500 mt-1">Vennen din vil se forslaget på sin side.</p>
            <button onClick={onClose} className="mt-4 text-sm font-medium text-wine-600 hover:text-wine-800">
              Lukk
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-wine-900 mb-1">{isBeer ? "Foreslå øl" : "Foreslå vin"}</h2>
            <p className="text-sm text-wine-500 mb-4">
              Del <span className="font-medium text-wine-700">{wineName}</span> med en venn
            </p>

            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-wine-600">Velg venn</p>
              {friends.length === 0 ? (
                <p className="text-xs text-wine-400 py-2">Ingen venner å foreslå til</p>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.userId}
                    onClick={() => setSelectedFriend(f.userId)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      selectedFriend === f.userId
                        ? "border-wine-400 bg-wine-50"
                        : "border-cream-200 hover:border-cream-300"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-wine-100 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-wine-500" />
                    </div>
                    <span className="text-sm font-medium text-wine-800 truncate">{f.name ?? f.email}</span>
                  </button>
                ))
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-wine-600 mb-1">Melding (valgfri)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder={isBeer ? "Hvorfor anbefaler du dette ølet?" : "Hvorfor anbefaler du denne vinen?"}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none resize-none transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!selectedFriend || sending}
              className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 active:scale-[0.98]"
            >
              {sending ? "Sender..." : "Send forslag"}
            </button>
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-wine-400 hover:text-wine-600 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
