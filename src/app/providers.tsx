"use client"

import { SessionProvider } from "next-auth/react"
import { BeerModeProvider } from "@/app/_components/beer-mode-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BeerModeProvider>
        {children}
      </BeerModeProvider>
    </SessionProvider>
  )
}
