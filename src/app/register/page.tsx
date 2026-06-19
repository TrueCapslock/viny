"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"


export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Noe gikk galt")
      setLoading(false)
      return
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (signInRes?.error) {
      setError("Konto opprettet, men innlogging feilet. Prøv å logge inn.")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 bg-subtle">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-wine-gradient shadow-lg shadow-wine-900/20 flex items-center justify-center mx-auto">
            <img src="/logo.svg" alt="Viny" className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-wine-900 mt-4">Registrer deg</h1>
          <p className="text-sm text-wine-400 mt-1">Opprett din konto på Viny</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-wine-900/5 border border-cream-200 p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1.5">Navn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
              placeholder="Ola Nordmann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1.5">E-post</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
              placeholder="din@epost.no"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1.5">Passord</label>
            <input
              type="password"
              required
              minLength={6}
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
            {loading ? "Oppretter konto..." : "Opprett konto"}
          </button>

          <p className="text-center text-sm text-wine-400">
            Har du allerede konto?{" "}
            <Link href="/login" className="text-wine-600 hover:text-wine-800 font-medium underline">
              Logg inn
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
