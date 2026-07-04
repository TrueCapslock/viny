"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import { UserDialogSkeleton } from "@/app/_components/skeletons"
import { useAdminUsers, useAdminSettings, useAdminImages } from "@/hooks/use-data"

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

type BlobImage = {
  url: string
  pathname: string
  size: number
  uploadedAt: string
  used: boolean
}

function UsersDialog({ onClose }: { onClose: () => void }) {
  const { users, loading, mutate } = useAdminUsers()
  const [toggling, setToggling] = useState<number | null>(null)

  async function toggleBeer(userId: number, current: boolean) {
    setToggling(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefersBeer: !current }),
    })
    if (res.ok) mutate()
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
            users.map((user: User) => (
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Øl</span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-wine-50 text-wine-700 border border-wine-100">
                    {user._count.wines} viner
                  </span>
                  {user.isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200">Admin</span>
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

function ImagesDialog({ onClose }: { onClose: () => void }) {
  const { images, loading, mutate } = useAdminImages()
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [deletingAll, setDeletingAll] = useState(false)

  const unused = images.filter((img: BlobImage) => !img.used)

  async function deleteImage(url: string) {
    setDeleting((prev) => new Set(prev).add(url))
    await fetch("/api/admin/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    })
    mutate()
    setDeleting((prev) => {
      const next = new Set(prev)
      next.delete(url)
      return next
    })
  }

  async function deleteAll() {
    setDeletingAll(true)
    const urls = unused.map((img: BlobImage) => img.url)
    if (urls.length > 0) {
      await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
    }
    mutate()
    setDeletingAll(false)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100">
          <h2 className="text-lg font-bold text-wine-900">Bilder</h2>
          <button onClick={onClose} className="text-wine-400 hover:text-wine-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-wine-400">
              <span className="w-4 h-4 border-2 border-wine-400 border-t-transparent rounded-full animate-spin mr-2" />
              Laster bilder...
            </div>
          ) : images.length === 0 ? (
            <p className="text-center py-8 text-sm text-wine-400">Ingen bilder funnet</p>
          ) : unused.length === 0 ? (
            <p className="text-center py-8 text-sm text-wine-500">Ingen ubrugte bilder</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-wine-600">
                  {unused.length} av {images.length} bilder er ubrukt
                </p>
                <button
                  onClick={deleteAll}
                  disabled={deletingAll}
                  className="rounded-full bg-red-50 border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? "Sletter..." : "Slett alle"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {unused.map((img: BlobImage) => (
                  <div key={img.url} className="relative group aspect-square rounded-xl overflow-hidden border border-cream-200 bg-cream-50">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => deleteImage(img.url)}
                        disabled={deleting.has(img.url)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between px-1.5">
                      <span className="text-[10px] text-white drop-shadow-md font-medium bg-black/30 px-1.5 py-0.5 rounded">
                        {formatSize(img.size)}
                      </span>
                    </div>
                    {deleting.has(img.url) && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session, update } = useSession()
  const [showUsers, setShowUsers] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const { settings, mutate: mutateSettings } = useAdminSettings()
  const [togglingBeer, setTogglingBeer] = useState(false)

  if (!session) return null

  async function toggleBeerGlobally() {
    setTogglingBeer(true)
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beerModeDisabled: !settings?.beerModeDisabled }),
    })
    if (res.ok) {
      mutateSettings()
      update({})
    }
    setTogglingBeer(false)
  }

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
                settings?.beerModeDisabled ? "bg-red-400" : "bg-cream-300"
              } ${togglingBeer ? "opacity-50" : ""}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${
                settings?.beerModeDisabled ? "translate-x-6" : "translate-x-1"
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

        <button
          onClick={() => setShowImages(true)}
          className="w-full flex items-center justify-between rounded-2xl bg-white border border-cream-200 p-4 hover:border-wine-300 hover:bg-wine-50 transition-all text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-wine-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-wine-900">Bilder</p>
              <p className="text-xs text-wine-500 mt-0.5">Se og slett ubrugte bilder</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-wine-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {showUsers && <UsersDialog onClose={() => setShowUsers(false)} />}
      {showImages && <ImagesDialog onClose={() => setShowImages(false)} />}
    </div>
  )
}
