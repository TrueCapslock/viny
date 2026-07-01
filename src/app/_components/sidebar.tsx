"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  Icon,
  Shelf,
  Plus,
  Corkscrew,
  Lists,
  Users,
} from "@/app/_components/icons"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { useSidebar } from "@/app/_components/sidebar-provider"
import { NotificationBell } from "@/app/_components/notification-bell"

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isBeer } = useBeerMode()
  const { collapsed, toggle } = useSidebar()

  const hide = pathname === "/login" || pathname === "/register"

  // Mark <html> so globals.css can skip `<main>` padding on /login|/register
  // (otherwise the 256/72px pl- would leave a blank strip on the left).
  useEffect(() => {
    if (hide) {
      document.documentElement.dataset.sidebarHidden = "true"
    } else {
      delete document.documentElement.dataset.sidebarHidden
    }
    return () => {
      delete document.documentElement.dataset.sidebarHidden
    }
  }, [hide])

  if (hide) return null

  const tabs = [
    { href: "/", label: isBeer ? "Ølsamling" : "Vinskap", icon: Shelf },
    { href: "/lister", label: "Lister", icon: Lists },
    { href: "/viner/ny", label: "Finn vin", icon: Plus },
    { href: "/venner", label: "Venner", icon: Users },
    { href: "/profil", label: "Profil", icon: Corkscrew },
  ]

  return (
    <aside
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-white border-r border-cream-200/80 shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
      aria-label="Hovednavigasjon"
    >
      {/* Brand */}
      <div
        className={`flex items-center border-b border-cream-200/80 shrink-0 h-16 ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 min-w-0"
          aria-label={isBeer ? "Øly" : "Viny"}
        >
          <img
            src={isBeer ? "/logo-beer.svg" : "/logo.svg"}
            alt=""
            className="w-7 h-7 shrink-0"
          />
          <span
            className={`font-bold tracking-wide text-wine-900 text-base whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
              collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
            }`}
            aria-hidden={collapsed}
          >
            {isBeer ? "Øly" : "Viny"}
          </span>
        </Link>
      </div>

      {/* Primary nav — equal-weight styling across all 5 desktop tabs.
          (Mobile BottomNav keeps its red filled central button — primary
          styling is reserved for mobile UX, gated by lg:hidden there.) */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href)
          const TabIcon = tab.icon
          const base =
            "flex items-center gap-3 rounded-xl transition-all duration-200 group relative whitespace-nowrap"
          const sizing = collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          const variants = isActive
            ? "bg-wine-100 text-wine-900 font-semibold ring-1 ring-wine-300"
            : "text-wine-600 hover:bg-cream-50 hover:text-wine-700"
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={collapsed ? tab.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`${base} ${sizing} ${variants}`}
            >
              <TabIcon className="w-6 h-6 shrink-0" />
              <span
                className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
                  collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                }`}
                aria-hidden={collapsed}
              >
                {tab.label}
              </span>
              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-wine-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {tab.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: notifications + sign-out (single block, adapts to collapsed) */}
      {session?.user && (
        <div
          className={`px-3 py-3 flex items-center gap-2 border-t border-cream-200/80 ${
            collapsed ? "flex-col justify-center" : ""
          }`}
        >
          <NotificationBell />
          <button
            onClick={() => signOut()}
            className={
              collapsed
                ? "w-10 h-10 flex items-center justify-center rounded-xl text-wine-500 hover:bg-cream-50 hover:text-wine-700 transition-colors"
                : "ml-auto text-xs text-wine-500 hover:text-wine-700 border border-cream-200 rounded-full px-3 py-1 transition-colors"
            }
            title="Logg ut"
            aria-label="Logg ut"
          >
            {collapsed ? (
              <Icon name="logout" size={20} className="shrink-0" />
            ) : (
              "Logg ut"
            )}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className={`flex items-center gap-3 w-full px-3 py-3 text-wine-500 hover:bg-cream-50 hover:text-wine-700 transition-colors border-t border-cream-200/80 ${
          collapsed ? "justify-center" : ""
        }`}
        aria-label={collapsed ? "Utvid sidebar" : "Kollaps sidebar"}
        title={collapsed ? "Utvid sidebar" : "Kollaps sidebar"}
      >
        <Icon
          name={collapsed ? "chevron_right" : "chevron_left"}
          size={22}
          className="shrink-0"
        />
        <span
          className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
          }`}
          aria-hidden={collapsed}
        >
          Kollaps
        </span>
      </button>
    </aside>
  )
}
