"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { Icon } from "@/app/_components/icons"
import { AvatarCropDialog } from "@/app/_components/avatar-crop-dialog"
import { ProfileSkeleton } from "@/app/_components/skeletons"
import { APP_VERSION } from "@/lib/version"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [image, setImage] = useState("")
  const [prefersBeer, setPrefersBeer] = useState(false)
  const [wineapiKey, setWineapiKey] = useState("")
  const [openRouterKey, setOpenRouterKey] = useState("")
  const [visionModel, setVisionModel] = useState("nvidia/nemotron-nano-12b-v2-vl:free")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [cropImage, setCropImage] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && !loaded) {
      queueMicrotask(() => {
        setName(session.user.name ?? "")
        setEmail(session.user.email ?? "")
        setImage(session.user.image ?? "")
        setPrefersBeer(session.user.prefersBeer ?? false)
        setWineapiKey(session.user.wineapiKey ?? "")
        setOpenRouterKey(session.user.openRouterKey ?? "")
        setVisionModel(session.user.visionModel ?? "nvidia/nemotron-nano-12b-v2-vl:free")
        setLoaded(true)
      })
    }
  }, [session, loaded])

  useEffect(() => {
    if (session?.user && loaded) {
      update({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reject HEIC/HEIF: iPhones save photos as HEIC by default, and iOS
    // Safari has a known bug where canvas.toBlob from a HEIC source
    // produces a corrupted/blank JPEG, so the cropped avatar never
    // renders. The user must either switch to JPEG (Settings > Camera >
    // Formats > Most Compatible) or pick a different photo. We also
    // check the filename since some HEIC files report an empty type.
    if (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    ) {
      setError(
        "iPhone-bilder lagres som HEIC, som ikke kan beskjæres i nettleseren. Endre kamerainnstillingene til «Mest kompatibel» (Innstillinger > Kamera > Formater) eller velg et annet bilde.",
      )
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    const url = URL.createObjectURL(file)
    setCropImage(url)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleCrop(blob: Blob) {
    setCropImage(null)
    setUploading(true)
    const fd = new FormData()
    fd.set("file", blob, "avatar.jpg")
    fd.set("folder", "user-images")
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setImage(url)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? "Kunne ikke laste opp bildet")
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        image: image || null,
        prefersBeer,
        wineapiKey: wineapiKey || null,
        openRouterKey: openRouterKey || null,
        visionModel: visionModel || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Noe gikk galt")
      setSaving(false)
      return
    }

    update({ prefersBeer })
    router.refresh()
    setSaving(false)
  }

  const inputClass = "w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 placeholder-wine-300 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"

  if (!loaded || !session) return <ProfileSkeleton />

  return (
    <div className="flex-1 px-4 pt-6 pb-24 animate-fade-in">
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative w-24 h-24 rounded-2xl overflow-hidden mx-auto block"
          >
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-wine-gradient flex items-center justify-center">
                <Icon name="person" size={64} className="text-cream-200" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading && (
            <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-wine-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-wine-900 mt-4">{session?.user?.name ?? "Profil"}</h1>
        <p className="text-sm text-wine-400 mt-0.5">{session?.user?.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1.5">Navn</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ditt navn"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1.5">E-post</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1.5">wineapi.io API-nøkkel</label>
          <input
            value={wineapiKey}
            onChange={(e) => setWineapiKey(e.target.value)}
            className={inputClass}
            placeholder="Skriv inn din wineapi.io API-nøkkel"
          />
          <p className="text-xs text-wine-400 mt-1">wineapi.io gir utvidet vininformasjon. 100 kall/døgn på gratisplanen. Kan oppgraderes på wineapi.io.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1.5">OpenRouter API-nøkkel</label>
          <input
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            className={inputClass}
            placeholder="sk-or-v1-..."
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-wine-400 mt-1">
            Brukes til AI-basert etikett-skanning. Hent nøkkelen p&aring;{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-wine-600">openrouter.ai/keys</a>.
            Bildet sendes via v&aring;r server, aldri direkte fra nettleseren.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-wine-700 mb-1.5">Visuell modell (OpenRouter)</label>
          <input
            value={visionModel}
            onChange={(e) => setVisionModel(e.target.value)}
            className={inputClass}
            placeholder="nvidia/nemotron-nano-12b-v2-vl:free"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-wine-400 mt-1">
            OpenRouter roterer gratis-modeller. Standard er Nemotron Nano. Bytt modell her dersom skanningen slutter å fungere.
          </p>
        </div>

        {!session.user.beerModeDisabled && (
          <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
              <div>
                <span className="block text-sm font-semibold text-wine-900">Jeg liker øl bedre</span>
                <span className="block text-xs text-wine-500 mt-0.5">Bytter appen til øl-modus med øl-labels, logo og lagertekst.</span>
              </div>
              <div
                role="switch"
                aria-checked={prefersBeer}
                tabIndex={0}
                onClick={() => setPrefersBeer((current) => !current)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault()
                    setPrefersBeer((current) => !current)
                  }
                }}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${prefersBeer ? "bg-gold-500" : "bg-cream-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${prefersBeer ? "translate-x-6" : "translate-x-1"}`} />
              </div>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg active:scale-[0.98]"
        >
          {saving ? "Lagrer..." : "Lagre endringer"}
        </button>

        <div className="pt-2 border-t border-cream-100 space-y-2">
          {session?.user?.isAdmin && (
            <Link
              href="/admin"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-wine-700 rounded-xl hover:bg-wine-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-wine-700 rounded-xl hover:bg-wine-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Last inn appen på nytt
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Logg ut
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-wine-300 mt-6">Viny v{APP_VERSION}</p>

      {cropImage && (
        <AvatarCropDialog
          imageUrl={cropImage}
          onCrop={handleCrop}
          onClose={() => {
            URL.revokeObjectURL(cropImage)
            setCropImage(null)
          }}
        />
      )}
    </div>
  )
}
