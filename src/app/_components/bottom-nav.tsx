"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { WineGlass, Grape, Corkscrew } from "@/app/_components/icons"

const tabs = [
  { href: "/", label: "Mine viner", icon: WineGlass },
  { href: "/viner/ny", label: "Legg til", icon: Grape, primary: true },
  { href: "/profil", label: "Profil", icon: Corkscrew },
]

export function BottomNav() {
  const pathname = usePathname()
  const hide = pathname === "/login" || pathname === "/register"

  if (hide) return null

  return (
    <nav className="fixed bottom-0 left-0 right-2 z-50 flex justify-center pb-2 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border border-cream-200 rounded-2xl shadow-lg shadow-wine-900/10 flex items-center justify-around px-2 py-1.5 max-w-sm w-full pointer-events-auto mx-auto">
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
                className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-wine-600 text-white shadow-sm shadow-wine-600/30"
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
              className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-wine-700" : "text-wine-400 hover:text-wine-600"
              }`}
            >
              <Icon className="w-5 h-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
