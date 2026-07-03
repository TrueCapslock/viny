"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Users } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { WineCard, type WineCardData } from "@/app/_components/wine-card"
import { useFriends, useWines } from "@/hooks/use-data"
import { WineCardSkeletonList } from "@/app/_components/skeletons"

type FriendInfo = { id: number; userId: number; name: string | null; email: string; image: string | null; canEdit: boolean; sharedList: boolean }

export default function FriendWinesPage() {
  const { isBeer } = useBeerMode()
  const { id } = useParams<{ id: string }>()
  const friendId = parseInt(id)

  const { friends, loading: friendsLoading } = useFriends()
  const { wines, loading: winesLoading } = useWines(friendId)

  const friend = useMemo(
    () => friends.find((f: FriendInfo) => f.userId === friendId) ?? null,
    [friends, friendId],
  )

  if (friendsLoading && !friend) {
    return (
      <div className="flex flex-col flex-1">
        <div className="bg-wine-gradient px-4 pt-1 pb-6">
          <div className="h-4 w-16 bg-white/20 animate-pulse rounded mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-white/20 animate-pulse rounded" />
              <div className="h-4 w-24 bg-white/20 animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 -mt-2 pb-24 pt-4">
          <WineCardSkeletonList count={4} />
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
              {friend.sharedList && (isBeer ? " · Felles ølliste" : " · Felles vinliste")}
              {friend.canEdit && !friend.sharedList && " · Du kan redigere"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-2 pb-24">
        {wines.length === 0 && !winesLoading ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-wine-50 border border-wine-100 flex items-center justify-center mx-auto">
              <img src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"} alt="" className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-wine-700 font-semibold mt-4">{isBeer ? "Ingen øl ennå" : "Ingen viner ennå"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wines.map((wine: { id: number; name: string; producer: string; vintage: number | null; type: string | null; image: string | null; _count?: { tastings: number } }) => {
              const card: WineCardData = {
                id: wine.id,
                name: wine.name,
                producer: wine.producer,
                vintage: wine.vintage,
                image: wine.image,
                type: wine.type,
                tastingCount: wine._count?.tastings,
              }
              return (
                <WineCard
                  key={wine.id}
                  wine={card}
                  chipDensity="minimal"
                  hideCellarBadge
                  from={`/venner/${friendId}`}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
