"use client"

import { useSession } from "next-auth/react"
import { useEffect, createContext, useContext } from "react"

type BeerModeContext = {
  isBeer: boolean
}

const BeerModeCtx = createContext<BeerModeContext>({ isBeer: false })

export function useBeerMode() {
  return useContext(BeerModeCtx)
}

export function BeerModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const isBeer = session?.user?.prefersBeer ?? false

  useEffect(() => {
    document.documentElement.setAttribute("data-beer", isBeer ? "true" : "false")
  }, [isBeer])

  return (
    <BeerModeCtx.Provider value={{ isBeer }}>
      {children}
    </BeerModeCtx.Provider>
  )
}
