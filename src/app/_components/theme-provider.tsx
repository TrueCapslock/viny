"use client"

import { useSession } from "next-auth/react"
import { useEffect, createContext, useContext } from "react"

type ThemeContext = {
  isDark: boolean
}

const ThemeCtx = createContext<ThemeContext>({ isDark: false })

export function useThemeMode() {
  return useContext(ThemeCtx)
}

/**
 * Co-located with BeerModeProvider so the app has two independent
 * CSS-attribute axes on `<html>`:
 *
 *   - `data-beer="true|false"`     (wine-mode ui vs beer-mode ui)
 *   - `data-theme="light|dark"`   (chromatic intensity)
 *
 * The 2x2 cross of (mode x theme) is addressed with four selectors in
 * `globals.css` (`:root`, `:root[data-theme="dark"]`,
 * `[data-beer="true"]`, `[data-beer="true"][data-theme="dark"]`).
 *
 * Read: from NextAuth's JWT (`session.user.prefersDarkMode`). No admin
 * override exists -- site-wide dark-mode lockdown is a future feature
 * if needed; today it mirrors the per-user `prefersBeer` toggle shape.
 *
 * Write: `document.documentElement.setAttribute("data-theme", ...)`
 * fires on every session change. We always write an explicit value
 * (`"light"` or `"dark"`) so the cascade in `globals.css` never has
 * to fall back to an `unset` branch -- that would silently keep the
 * previous theme across a logout/login.
 *
 * `beerModeDisabled` from `siteSettings` (a server-side kill-switch
 * for beer-mode) is intentionally NOT honored here: dark-mode is
 * independent of beer-mode and should remain tunable by the user.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const isDark = session?.user?.prefersDarkMode ?? false

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
  }, [isDark])

  return (
    <ThemeCtx.Provider value={{ isDark }}>
      {children}
    </ThemeCtx.Provider>
  )
}
