"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Users } from "@/app/_components/icons"
import { StaticStars } from "@/app/_components/star-rating"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { typeLabel } from "@/lib/beer"

export default function FriendWinesPage() {
  const { isBeer } = useBeerMode()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  type WineData = { id: number; name: string; producer: string; vintage: number | null; type: string | null; varietal: string | null; country: string | null; region: string | null; image: string | null; notes: string | null; inCellar: boolean; quantity: number; _count?: { tastings: number }; tastings?: { rating: number | null }[] }
  type FriendInfo = { id: number; userId: number; name: string | null; email: string; image: string | null; canEdit: boolean; sharedList: boolean }

  const [friend, setFriend] = useState<FriendInfo | null>(null)
  const [wines, setWines] = useState<WineData[]>([])
  const [ratingMap, setRatingMap] = useState<Record<number, number>>({})
  const [canEdit, setCanEdit] = useState(false)
  const [sharedList, setSharedList] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const friendsRes = await fetch("/api/friends")
      const friendsData = await friendsRes.json()

      const friendInfo = friendsData.friends.find((f: FriendInfo) => f.userId === parseInt(id))
      if (!friendInfo) {
        router.push("/venner")
        return
      }
      setFriend(friendInfo)
      setCanEdit(friendInfo.canEdit)
      setSharedList(friendInfo.sharedList)

      const winesRes = await fetch(`/api/viner?userId=${id}`)
      const winesData = await winesRes.json()
      setWines(winesData)

      if (winesData.length > 0) {
        const ratings: Record<number, number> = {}
        for (const wine of winesData) {
          const res = await fetch(`/api/viner/${wine.id}`)
          const full = await res.json()
          if (full.tastings?.length > 0) {
            const avg = full.tastings.reduce((s: number, t: { rating: number | null }) => s + (t.rating || 0), 0) / full.tastings.length
            ratings[wine.id] = Math.round(avg)
          }
        }
        setRatingMap(ratings)
      }

      setLoading(false)
    }
    load()
  }, [id, router])

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

  if (!friend) return null

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-wine-gradient px-4 pt-1 pb-6">
        <Link
          href="/venner"
          className="inline-flex items-center gap-1.5 text-sm text-wine-200 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Venner
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white/20">
            {friend.image ? (
              <img src={friend.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-7 h-7 text-gold-300" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{friend.name ?? friend.email}</h1>
            <p className="text-sm text-wine-200/90">
              {wines.length} {isBeer ? "øl" : wines.length === 1 ? "vin" : "viner"}
              {sharedList && (isBeer ? " · Felles ølliste" : " · Felles vinliste")}
              {canEdit && !sharedList && " · Du kan redigere"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-2 pb-24">
        {wines.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-wine-50 border border-wine-100 flex items-center justify-center mx-auto">
              <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="" className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-wine-700 font-semibold mt-4">{isBeer ? "Ingen øl ennå" : "Ingen viner ennå"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wines.map((wine) => {
              const avg = ratingMap[wine.id]
              return (
                <Link
                  key={wine.id}
                  href={`/viner/${wine.id}`}
                  className="block rounded-2xl bg-white border border-cream-200/80 card-hover shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3.5">
                      {wine.image ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-cream-200 shadow-sm">
                          <img src={wine.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-wine-50 border border-wine-100 flex items-center justify-center shrink-0">
                          <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="" className="w-7 h-7 opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h2 className="font-bold text-wine-900 truncate text-[15px]">{wine.name}</h2>
                        <p className="text-sm text-wine-500 truncate">
                          {wine.producer}
                          {wine.vintage && `, ${wine.vintage}`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {wine.type && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-wine-50 text-wine-600 border border-wine-100/80">
                              {typeLabel(wine.type, isBeer)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-100/80">
                      <div className="flex items-center gap-2">
                        {avg > 0 && <StaticStars rating={avg} />}
                      </div>
                      <span className="text-[11px] text-wine-400 font-medium">
                        {wine._count?.tastings ?? 0} smaksnotat{wine._count?.tastings !== 1 ? "er" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
