"use client"

import { SessionProvider } from "next-auth/react"
import { BeerModeProvider } from "@/app/_components/beer-mode-provider"
import { SidebarProvider } from "@/app/_components/sidebar-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BeerModeProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </BeerModeProvider>
    </SessionProvider>
  )
}
