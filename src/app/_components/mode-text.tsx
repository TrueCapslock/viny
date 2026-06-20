"use client"

import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { typeLabel } from "@/lib/beer"

export function ModeText({ wine, beer }: { wine: string; beer: string }) {
  const { isBeer } = useBeerMode()
  return isBeer ? beer : wine
}

export function ModeTypeLabel({ type }: { type: string }) {
  return typeLabel(type)
}

export function ModeLogo({ className }: { className?: string }) {
  const { isBeer } = useBeerMode()
  return <img src={isBeer ? "/logo-beer.svg" : "/logo.svg"} alt="" className={className} />
}
