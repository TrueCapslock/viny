"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

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

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

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
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data)
        }
        setLoading(false)
      })
  }, [session, router])

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
        <p className="text-wine-200 text-sm mt-1">Brukeradministrasjon</p>
      </div>

      <div className="flex-1 px-4 -mt-2 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-wine-200 border-t-wine-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-xl border border-cream-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wine-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-5 h-5 text-wine-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wine-900 truncate">{user.name ?? user.email}</p>
                  <p className="text-xs text-wine-400 truncate">{user.email}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-wine-50 text-wine-600 border border-wine-100">
                      {user._count.wines} viner
                    </span>
                    {user.isAdmin && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200">
                        Admin
                      </span>
                    )}
                    {user.prefersBeer && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Øl-modus
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-wine-400 shrink-0">
                  {new Date(user.createdAt).toLocaleDateString("nb-NO")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
