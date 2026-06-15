"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { WineGlass, Stars } from "@/app/_components/icons"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-wine-gradient text-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <WineGlass className="w-6 h-7 text-gold-300" />
          <span className="text-lg font-bold tracking-wide">Viny</span>
        </Link>
        <Stars className="flex-1 h-4 text-gold-200" />
        {session?.user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-wine-200">{session.user.email}</span>
            <button
              onClick={() => signOut()}
              className="text-wine-200 hover:text-white border border-wine-400/30 rounded-full px-3 py-1 transition-colors"
            >
              Logg ut
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm text-wine-200 hover:text-white border border-wine-400/30 rounded-full px-3 py-1 transition-colors"
          >
            Logg inn
          </Link>
        )}
      </div>
    </header>
  )
}
