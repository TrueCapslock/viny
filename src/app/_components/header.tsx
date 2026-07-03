"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { WineGlass } from "@/app/_components/icons"

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const hide = pathname === "/login" || pathname === "/register"
  if (hide) return null

  return (
    <header className="bg-wine-gradient text-white sticky top-0 z-40 shadow-lg shadow-wine-900/20">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-white/15 rounded-xl p-1.5">
            <WineGlass className="w-4 h-5 text-gold-300" />
          </div>
          <span className="text-lg font-bold tracking-wide">Uva</span>
        </Link>
        {session?.user && (
          <button
            onClick={() => signOut()}
            className="text-xs text-wine-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3.5 py-1.5 transition-all"
          >
            Logg ut
          </button>
        )}
      </div>
    </header>
  )
}
