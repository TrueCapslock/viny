"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  SIDEBAR_COLLAPSED,
  SIDEBAR_EXPANDED,
  SIDEBAR_STORAGE_KEY,
} from "@/app/_lib/sidebar-dimensions"

type SidebarCtx = {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Start expanded on both server and client to keep hydration consistent.
  // The persisted preference is applied in the effect below (causes a brief
  // width transition on first reload, but matches what users expect on revisit).
  const [collapsed, setCollapsed] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved === "1") setCollapsed(true)
    } catch {
      // localStorage unavailable (privacy mode / SSR-restricted env) — keep default
    }
  }, [])

  // Persist + sync CSS variable
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0")
    } catch {}
    const root = document.documentElement
    root.style.setProperty("--sidebar-width", collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED)
    root.dataset.sidebarCollapsed = collapsed ? "true" : "false"
  }, [collapsed])

  const toggle = () => setCollapsed((c) => !c)

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}
