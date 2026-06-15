"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Grape } from "@/app/_components/icons"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Noe gikk galt")
      return
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (signInRes?.error) {
      setError("Konto opprettet, men innlogging feilet. Prøv å logge inn.")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="flex-1 bg-wine-gradient-light flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Grape className="w-12 h-14 mx-auto text-wine-400" />
          <h1 className="text-2xl font-bold text-wine-800 mt-4">Registrer deg</h1>
          <p className="text-sm text-wine-400 mt-1">Opprett din konto på Viny</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-cream-200 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1">Navn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1">E-post</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wine-700 mb-1">Passord</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-wine-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-wine-700 transition-colors shadow-sm"
          >
            Opprett konto
          </button>

          <p className="text-center text-sm text-wine-400">
            Har du allerede konto?{" "}
            <Link href="/login" className="text-wine-600 hover:text-wine-800 underline">
              Logg inn
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
