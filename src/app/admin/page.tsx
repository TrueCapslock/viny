"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { UserDialogSkeleton } from "@/app/_components/skeletons"

type User = {
  id: number
  name: string | null
  email: string
  image: string | null
  isAdmin: boolean
  prefersBeer: boolean
  createdAt: string
  _count: { wines: number }
}

function UsersDialog({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data)
        setLoading(false)
      })
  }, [])

  async function toggleBeer(userId: number, current: boolean) {
    setToggling(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefersBeer: !current }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, prefersBeer: !current } : u)))
    }
    setToggling(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100">
          <h2 className="text-lg font-bold text-wine-900">Brukere</h2>
          <button onClick={onClose} className="text-wine-400 hover:text-wine-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="p-4">
              <UserDialogSkeleton />
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-cream-50 rounded-xl border border-cream-200 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-4 h-4 text-wine-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wine-900 truncate">{user.name ?? user.email}</p>
                  <p className="text-xs text-wine-400 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {user.prefersBeer && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Øl
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-wine-50 text-wine-600 border border-wine-100">
                    {user._count.wines} viner
                  </span>
                  {user.isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={() => toggleBeer(user.id, user.prefersBeer)}
                    disabled={toggling === user.id}
                    className={`ml-1 w-8 h-5 rounded-full transition-colors relative shrink-0 ${
                      user.prefersBeer ? "bg-amber-400" : "bg-cream-300"
                    } ${toggling === user.id ? "opacity-50" : ""}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
                      user.prefersBeer ? "translate-x-[14px]" : "translate-x-[3px]"
                    }`} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [showUsers, setShowUsers] = useState(false)
  const [beerModeDisabled, setBeerModeDisabled] = useState(false)
  const [togglingBeer, setTogglingBeer] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) {
          router.push("/")
          return null
        }
        return r.json()
      })
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setBeerModeDisabled(data.beerModeDisabled))
  }, [session, router])

  async function toggleBeerGlobally() {
    setTogglingBeer(true)
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beerModeDisabled: !beerModeDisabled }),
    })
    if (res.ok) {
      setBeerModeDisabled(!beerModeDisabled)
      update({})
    }
    setTogglingBeer(false)
  }

  if (!session) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-wine-gradient text-white px-4 pt-1 pb-6">
        <Link href="/profil" className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Profil
        </Link>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-wine-200 text-sm mt-1">Innstillinger</p>
      </div>

      <div className="flex-1 px-4 -mt-2 pb-24 space-y-3">
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
          <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
            <div>
              <p className="text-sm font-semibold text-wine-900">Deaktiver øl-modus</p>
              <p className="text-xs text-wine-500 mt-0.5">Skrur av øl-funksjonalitet for alle brukere. Ingen vil kunne bruke øl-modus.</p>
            </div>
            <button
              onClick={toggleBeerGlobally}
              disabled={togglingBeer}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                beerModeDisabled ? "bg-red-400" : "bg-cream-300"
              } ${togglingBeer ? "opacity-50" : ""}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${
                beerModeDisabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </label>
        </div>

        <button
          onClick={() => setShowUsers(true)}
          className="w-full flex items-center justify-between rounded-2xl bg-white border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-wine-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-wine-900">Brukere</p>
              <p className="text-xs text-wine-500 mt-0.5">Se alle registrerte brukere</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-wine-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {showUsers && <UsersDialog onClose={() => setShowUsers(false)} />}
    </div>
  )
}
