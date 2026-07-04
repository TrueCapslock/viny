"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isBeer } = useBeerMode()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const justReset = searchParams.get("reset") === "success"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (res?.error) {
      setError("Feil e-post eller passord")
      setLoading(false)
    } else {
      // Drop the ?reset=success param on successful login so the banner
      // doesn't reappear if the user later navigates back.
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="text-center mb-8">
        <img
          src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"}
          alt={isBeer ? "Humle" : "Uva"}
          className="w-12 h-12 mx-auto"
        />
        <h1 className="text-2xl font-bold text-wine-900 mt-4">Logg inn</h1>
        <p className="text-sm text-wine-400 mt-1">Velkommen tilbake til {isBeer ? "Humle" : "Uva"}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-wine-900/5 border border-cream-200 p-6 space-y-4">
        {justReset && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>Passordet er oppdatert. Logg inn med det nye passordet ditt.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-wine-700 mb-1.5">E-post</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            placeholder="din@epost.no"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-wine-700">Passord</label>
            <Link href="/glemt-passord" className="text-xs text-wine-600 hover:text-wine-800 underline">
              Glemt passord?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg active:scale-[0.98]"
        >
          {loading ? "Logger inn..." : "Logg inn"}
        </button>

        <p className="text-center text-sm text-wine-400">
          Har du ikke konto?{" "}
          <Link href="/register" className="text-wine-600 hover:text-wine-800 font-medium underline">
            Registrer deg
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 bg-subtle">
      {/* Suspense is required by Next.js 15+ for any client component that
          calls useSearchParams during streaming SSR. Without it the build
          fails or hydration warns on /login visits. */}
      <Suspense fallback={<div className="w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
