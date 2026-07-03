"use client"

import { SessionProvider } from "next-auth/react"
import { BeerModeProvider } from "@/app/_components/beer-mode-provider"
import { ThemeProvider } from "@/app/_components/theme-provider"
import { SidebarProvider } from "@/app/_components/sidebar-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <BeerModeProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </BeerModeProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
