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
    <header className="bg-topbar text-white sticky top-0 z-40">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <img src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"} alt="Uva" className="w-7 h-7" />
          <span className="text-base font-bold tracking-wide">{isBeer ? "Humle" : "Uva"}</span>
        </Link>
        {session?.user && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Avatar + name (desktop only) is a single tap target that
                jumps to /profil. Also signals the active profile route. */}
            <Link
              href="/profil"
              className={`hidden lg:inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors hover:bg-white/10 active:bg-white/15 ${
                pathname === "/profil" ? "bg-white/15" : ""
              }`}
              title="Min profil"
              aria-label={`Min profil${session.user.name?.trim() ? ` (${session.user.name})` : ""}`}
            >
              {/* Avatar — same pattern as notification-bell.tsx + admin/page.tsx */}
              <span className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 overflow-hidden">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-3.5 h-3.5 text-white/70"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </span>
              {session.user.name?.trim() && (
                <span className="text-sm font-medium text-white/85 truncate max-w-[160px]">
                  {session.user.name}
                </span>
              )}
            </Link>
            <NotificationBell />
            {/* Sign-out lives in the sidebar on desktop (lg+) */}
            <button
              onClick={() => signOut()}
              className="text-xs text-white/70 hover:text-white border border-white/30 rounded-full px-3 py-1 transition-colors lg:hidden"
            >
              Logg ut
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
