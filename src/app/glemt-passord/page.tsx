"use client"

import { useState } from "react"
import Link from "next/link"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

type Status = "idle" | "sending" | "sent" | "error"

export default function ForgotPasswordPage() {
  const { isBeer } = useBeerMode()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      // The back-end returns the same generic success whether or not the
      // email is registered, so we never reveal existence here either.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Noe gikk galt")
      }
      setStatus("sent")
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Noe gikk galt")
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 bg-subtle">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-wine-gradient shadow-lg shadow-wine-900/20 flex items-center justify-center mx-auto">
            <img src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"} alt={isBeer ? "Humle" : "Uva"} className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-wine-900 mt-4">Glemt passord</h1>
          <p className="text-sm text-wine-400 mt-1">
            Skriv inn e-posten din, så sender vi en lenke for å tilbakestille passordet.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-wine-900/5 border border-cream-200 p-6 space-y-4">
          {status === "sent" ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>
                  Hvis <span className="font-medium">{email}</span> er registrert hos oss,
                  har vi sendt en lenke for å tilbakestille passordet. Sjekk innboksen
                  (og spam-mappen) om et par minutter.
                </span>
              </div>
              <p className="text-xs text-wine-400 text-center">
                Lenken er gyldig i 24 timer.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm text-wine-600 hover:text-wine-800 font-medium underline"
              >
                Tilbake til innlogging
              </Link>
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
                <label htmlFor="forgot-email" className="block text-sm font-medium text-wine-700 mb-1.5">E-post</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm text-wine-900 focus:border-wine-400 focus:ring-1 focus:ring-wine-400 outline-none transition-all"
                  placeholder="din@epost.no"
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-full bg-gradient-to-r from-wine-600 to-wine-700 px-4 py-3 text-sm font-medium text-white hover:from-wine-700 hover:to-wine-800 disabled:opacity-50 transition-all shadow-md shadow-wine-600/20 hover:shadow-lg active:scale-[0.98]"
              >
                {status === "sending" ? "Sender..." : "Send tilbakestillingslenke"}
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
    </div>
  )
}
