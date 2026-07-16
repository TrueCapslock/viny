"use client"

import { SessionProvider } from "next-auth/react"
import { BeerModeProvider } from "@/app/_components/beer-mode-provider"
import { ThemeProvider } from "@/app/_components/theme-provider"
import { SidebarProvider } from "@/app/_components/sidebar-provider"
import { ZoomRestoreOnFocusExit } from "@/app/_components/zoom-restore"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <BeerModeProvider>
          <SidebarProvider>
            {/*
              * iOS Safari auto-zoom mitigation. See ZoomRestoreOnFocusExit
              * for the full rationale. The component renders nothing;
              * it just attaches the focusin/focusout listeners globally.
              * Defence-in-depth to the CSS clamp in globals.css.
              */}
            <ZoomRestoreOnFocusExit />
            {children}
          </SidebarProvider>
        </BeerModeProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
