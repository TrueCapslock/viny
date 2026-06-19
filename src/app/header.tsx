"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const hide = pathname === "/login" || pathname === "/register"
  if (hide) return null

  return (
    <header className="bg-wine-gradient text-white sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Viny" className="w-7 h-7" />
          <span className="text-base font-bold tracking-wide">Viny</span>
        </Link>
        {session?.user && (
          <button
            onClick={() => signOut()}
            className="text-xs text-wine-200 hover:text-white border border-wine-400/30 rounded-full px-3 py-1 transition-colors"
          >
            Logg ut
          </button>
        )}
      </div>
    </header>
  )
}
