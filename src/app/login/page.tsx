"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Grape } from "@/app/_components/icons"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (res?.error) {
      setError("Feil e-post eller passord")
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
          <h1 className="text-2xl font-bold text-wine-800 mt-4">Logg inn</h1>
          <p className="text-sm text-wine-400 mt-1">Velkommen tilbake til Viny</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-cream-200 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-wine-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-wine-700 transition-colors shadow-sm"
          >
            Logg inn
          </button>

          <p className="text-center text-sm text-wine-400">
            Har du ikke konto?{" "}
            <Link href="/register" className="text-wine-600 hover:text-wine-800 underline">
              Registrer deg
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
