"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationBell } from "@/app/_components/notification-bell"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isBeer } = useBeerMode()
  const hide = pathname === "/login" || pathname === "/register"
  if (hide) return null

  return (
    <header className="bg-wine-gradient text-white sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="Viny" className="w-7 h-7" />
          <span className="text-base font-bold tracking-wide">{isBeer ? "Øly" : "Viny"}</span>
        </Link>
        {session?.user && (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => signOut()}
              className="text-xs text-white/70 hover:text-white border border-white/30 rounded-full px-3 py-1 transition-colors"
            >
              Logg ut
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
