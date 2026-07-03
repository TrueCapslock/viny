"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type Status = "idle" | "saving" | "success" | "error"

function ResetPasswordForm() {
  const { isBeer } = useBeerMode()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <LogoHeader isBeer={isBeer} />
          <h1 className="text-2xl font-bold text-wine-900 mt-4">Tilbakestill passord</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-lg shadow-wine-900/5 border border-cream-200 p-6 space-y-4">
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Tilbakestillingslenken mangler eller er ugyldig. Be om en ny på
            {" "}
            <Link href="/glemt-passord" className="underline font-medium">
              glemt passord-siden
            </Link>
            .
          </div>
          <Link
            href="/login"
            className="block text-center text-sm text-wine-600 hover:text-wine-800 font-medium underline"
          >
            Tilbake til innlogging
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (password !== confirm) {
      setStatus("error")
      setErrorMsg("Passordene er ikke like")
      return
    }
    if (password.length < 6) {
      setStatus("error")
      setErrorMsg("Passordet må være minst 6 tegn")
      return
    }
    setStatus("saving")
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Noe gikk galt")
      }
      setStatus("success")
      // Brief delay so the success state is visible before navigation.
      setTimeout(() => {
        router.push("/login?reset=success")
        router.refresh()
      }, 800)
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Noe gikk galt")
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="text-center mb-8">
        <LogoHeader isBeer={isBeer} />
        <h1 className="text-2xl font-bold text-wine-900 mt-4">Nytt passord</h1>
        <p className="text-sm text-wine-400 mt-1">
          Velg et nytt passord for kontoen din.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-wine-900/5 border border-cream-200 p-6 space-y-4">
        {status === "success" ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>Passordet er oppdatert. Vi sender deg til innlogging...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-wine-700 mb-1.5">Nytt passord</label>
              <input
                id="reset-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-wine-700 mb-1.5">Gjenta passord</label>
              <input
                id="reset-confirm"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={status === "saving"}
              className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg active:scale-[0.98]"
            >
              {status === "saving" ? "Lagrer..." : "Lagre nytt passord"}
            </button>

            <p className="text-center text-sm text-wine-400">
              <Link href="/login" className="text-wine-600 hover:text-wine-800 font-medium underline">
                Tilbake til innlogging
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 bg-subtle">
      <Suspense fallback={<div className="w-full max-w-sm" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

function LogoHeader({ isBeer }: { isBeer: boolean }) {
  return (
    <div className="w-16 h-16 rounded-2xl bg-wine-gradient shadow-lg shadow-wine-900/20 flex items-center justify-center mx-auto">
      <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt={isBeer ? "Øly" : "Viny"} className="w-9 h-9" />
    </div>
  )
}
