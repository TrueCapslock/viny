"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Shelf, Plus, Corkscrew, Lists } from "@/app/_components/icons"
import { Users } from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"

export function BottomNav() {
  const pathname = usePathname()
  const { isBeer } = useBeerMode()
  const hide = pathname === "/login" || pathname === "/register"

  if (hide) return null

  const tabs = [
    { href: "/", label: isBeer ? "Ølsamling" : "Vinskap", icon: Shelf },
    { href: "/lister", label: "Lister", icon: Lists },
    { href: "/viner/ny", label: "Legg til", icon: Plus, primary: true },
    { href: "/venner", label: "Venner", icon: Users },
    { href: "/profil", label: "Profil", icon: Corkscrew },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-3 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-xl border border-cream-200/80 rounded-2xl shadow-xl shadow-wine-900/10 flex items-center justify-around px-1.5 py-1.5 max-w-md w-full pointer-events-auto mx-3">
        {tabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href)
          const Icon = tab.icon

          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-wine-600 text-white shadow-md shadow-wine-600/30 scale-105"
                    : "bg-wine-600/90 text-white hover:bg-wine-700 shadow-sm"
                }`}
              >
                <Icon className="w-5 h-6" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative ${
                isActive ? "text-wine-700" : "text-wine-400 hover:text-wine-600"
              }`}
            >
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-wine-600" />
              )}
              <Icon className="w-5 h-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
