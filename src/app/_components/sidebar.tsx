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
    { href: "/", label: isBeer ? "Ølkasse" : "Vinskap", icon: Shelf },
    { href: "/lister", label: "Lister", icon: Lists },
    { href: "/viner/ny", label: "Finn vin", icon: Plus },
    { href: "/venner", label: "Venner", icon: Users },
    { href: "/profil", label: "Profil", icon: Corkscrew },
  ]

  return (
    <aside
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-white border-r border-cream-200/80 shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden sidebar-bg-wine ${
        collapsed ? "w-[64px]" : "w-64"
      }`}
      data-sidebar-collapsed={collapsed ? "true" : undefined}
      aria-label="Hovednavigasjon"
    >
      {/* Brand */}
      <div
        className={`flex items-center border-b border-cream-200/80 shrink-0 h-16 ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
      >
        {/* In collapsed mode the brandLink flips to a single-axis layout
            (no `gap` + `justify-center` on the Link). Without an in-flow
            gap, the Link's intrinsic width drops to 28px (just [img][span
            max-w-0 0]), so the parent brandDiv's `justify-center px-2`
            parks the Link at x=17.5..45.5 — the img, sitting at
            flex-start of that 28-wide Link, lands at center x=31.5
            (= aside content center x=31.5 after the 1px right-border),
            in lockstep with the tab icons below.

            Why we have to drop the gap rather than just adding
            `justify-center` to the Link: with gap-2.5 unconditional the
            Link's intrinsic (28+10+0 = 38) exactly matches its content
            width, leaving `justify-content: center` zero free space to
            redistribute — the img would still sit at flex-start of the
            Link (this was the bug the earlier `safe center` attempt hit;
            the runtime measurement confirmed the img stayed at x=13..41
            / center x=27). Dropping the gap is what creates the freedom
            for the brandDiv to actually center the Link (and hence img)
            in the aside.

            In expanded mode the gap returns (img + label lockup needs
            breathing room), no justify-center on the Link — the Link
            sits at flex-start of brandDiv (px-5) at x=20, giving the
            lockup its left-aligned navbar look. */}
        <Link
          href="/"
          className={`flex items-center min-w-0 ${
            collapsed ? "justify-center" : "gap-2.5"
          }`}
          aria-label={isBeer ? "Humle" : "Uva"}
        >
          <img
            src={isBeer ? "/logo-humle.svg" : "/logo-uva.svg"}
            alt=""
            className="w-7 h-7 shrink-0"
          />
          <span
            className={`font-bold tracking-wide text-wine-900 text-base whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
              collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
            }`}
            aria-hidden={collapsed}
          >
            {isBeer ? "Humle" : "Uva"}
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
          const sizing = collapsed ? "px-2 py-2.5" : "px-3 py-2.5"
          const variants = isActive
            ? "bg-wine-100 text-wine-900 font-semibold ring-1 ring-wine-300"
            : "text-wine-600 hover:bg-cream-50 hover:text-wine-700"
          // safe-center inline style only when collapsed: tab flex children
          // [icon 24][gap-3 12][label max-w-0 0] = 36px in a 24px tab content
          // box (after nav p-3 + tab px-2 at 64px) -- 12px of overflow.
          // Tailwind's `justify-center` resolves to `unsafe center`, which
          // would distribute the overflow symmetrically (~6px each side) and
          // shift the icon ~6px left of the bar's true center. safe-center
          // clips the overflow at the start edge instead, which at 64px wide
          // bar coincidentally lands the 24px icon exactly on the bar's
          // center (icon x=20..44, aside center x=32). Keeping gap-3
          // unconditional also sidesteps a transient off-center blip during
          // the 300ms expand transition (gap isn't transitionable; toggling
          // it would snap while the label's max-w animation runs).
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={collapsed ? tab.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`${base} ${sizing} ${variants}`}
              style={collapsed ? { justifyContent: "safe center" } : undefined}
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
