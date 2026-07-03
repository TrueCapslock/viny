"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useBeerMode } from "@/app/_components/beer-mode-provider"
import { StaticStars } from "@/app/_components/star-rating"
import { typeLabel } from "@/lib/beer"
import { countryFlag } from "@/lib/countries"
import { Chip } from "@/app/_components/chips"

/**
 * Flat shape consumed by WineCard. Decouples the UI from upstream API
 * response shapes (Prisma types, SWR fetchers) so adding/removing fields
 * at the data layer doesn't have to ripple through the component.
 */
export interface WineCardData {
  id: number
  name: string
  producer: string
  vintage?: number | null
  image?: string | null
  type?: string | null
  country?: string | null
  inCellar?: boolean
  quantity?: number | null
  /** 0–5 average; rendering is suppressed when missing or 0. */
  avgRating?: number | null
  /** Total tasting notes count for the bottom-right label. */
  tastingCount?: number
}

interface WineCardProps {
  wine: WineCardData
  /**
   * "card" (default) renders the vertical tile used in cellar + friends'
   * wines lists. "row" renders the compact horizontal layout used in the
   * list-detail page.
   */
  variant?: "card" | "row"
  /**
   * Chip-strip density. "full" shows varietal + country + cellar badge;
   * "minimal" hides varietal + country (used by the friends' wines view
   * where authors curate a simpler row). The cellar badge is independent
   * — use `hideCellarBadge` for that.
   */
  chipDensity?: "full" | "minimal"
  /** Force-hide the cellar-status pill regardless of `wine.inCellar`. */
  hideCellarBadge?: boolean
  /** Stagger entrance animation: ms delay applied to the outer element. */
  animationDelay?: number
  /** Right-most slot in the row layout (e.g. a remove button). */
  rightSlot?: ReactNode
  /**
   * Top-right overlay slot in the card layout. Rendered absolutely
   * positioned above the card's `<Link>` so an injected control (e.g. a
   * remove-from-list button) sits on top of the card without being a
   * child of the navigation anchor.
   */
  topRightSlot?: ReactNode
  /**
   * Origin URL the wine-link navigates from. Threaded through as
   * `?from=${encodeURIComponent(from)}` on the wrapping Link so the
   * detail page's back-button can restore the caller. Sanitised by the
   * detail page (only known list roots are honoured).
   */
  from?: string
}

export function WineCard({
  wine,
  variant = "card",
  chipDensity = "full",
  hideCellarBadge = false,
  animationDelay,
  rightSlot,
  topRightSlot,
  from,
}: WineCardProps) {
  const { isBeer } = useBeerMode()
  const delayStyle =
    animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined

  const LogoPlaceholder = () => (
    <img
      src={isBeer ? "/logo-humle.svg" : "/wine-glass.svg"}
      alt=""
      className="w-1/2 h-1/2 opacity-50"
    />
  )

  // Cellar chip wording for the card variant: always quantity-first
  // (e.g. "2 fl." for wine, "2 stk." in beer mode). The count IS the
  // cellar signal — no fallback to a generic "I vinskap" / "I ølkassen"
  // because that wording reads as decorative noise next to a numeric
  // sibling. Defaulting `?? 0` (not `?? 1`) intentionally surfaces
  // caller bugs as a truthful "0 fl." instead of a misleading "1 fl."
  // — the previous `?? 1` masked a real data-pipeline regression
  // where a lister-page mapping forgot to ship quantity.
  const cardCellarLabel = `${wine.quantity ?? 0} ${isBeer ? "stk." : "fl."}`

  // Cellar pill wording for the row variant. The list-detail page only
  // ever ships the inCellar boolean (no quantity), so we keep this simple.
  const rowCellarLabel = isBeer ? "I ølkassen" : "I vinskap"

  if (variant === "row") {
    return (
      <div
        style={delayStyle}
        className="bg-white rounded-2xl border border-cream-200 p-3 shadow-sm flex items-center gap-3 transition-opacity"
      >
        {wine.image ? (
          <img
            src={wine.image}
            alt=""
            className="w-12 h-12 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-wine-50 border border-cream-200 flex items-center justify-center shrink-0">
            <LogoPlaceholder />
          </div>
        )}
        <Link
          href={`/viner/${wine.id}${
            from ? `?from=${encodeURIComponent(from)}` : ""
          }`}
          className="flex-1 min-w-0"
        >
          <p className="font-semibold text-wine-900 truncate text-sm">{wine.name}</p>
          <p className="text-xs text-wine-500 truncate mt-0.5">
            {wine.producer}
            {wine.vintage && ` · ${wine.vintage}`}
          </p>
        </Link>

        {wine.inCellar && !hideCellarBadge && (
          <Chip label={rowCellarLabel} />
        )}

        {typeof wine.avgRating === "number" && wine.avgRating > 0 && (
          <span className="text-xs text-gold-700 font-medium">{wine.avgRating}/5</span>
        )}

        {rightSlot}
      </div>
    )
  }

  // variant === "card" (default)
  return (
    <div className="relative">
      <Link
        href={`/viner/${wine.id}${
          from ? `?from=${encodeURIComponent(from)}` : ""
        }`}
        style={delayStyle}
        className="block rounded-2xl bg-white border border-cream-200/80 card-hover shadow-sm"
      >
        <div className="p-4">
          <div className="flex items-start gap-3.5">
            {wine.image ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-cream-200 shadow-sm">
                <img src={wine.image} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-wine-50 border border-wine-100 flex items-center justify-center shrink-0">
                <LogoPlaceholder />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="font-bold text-wine-900 truncate text-[15px]">{wine.name}</h2>
              <p className="text-sm text-wine-500 truncate">
                {wine.producer}
                {wine.vintage && `, ${wine.vintage}`}
              </p>              <div className="flex flex-wrap gap-1.5 mt-2 pr-8">
                {chipDensity === "full" && wine.country && (
                  <Chip label={wine.country} flag={countryFlag(wine.country)} />
                )}
                {wine.type && (
                  <Chip label={typeLabel(wine.type)} />
                )}
                {wine.inCellar && !hideCellarBadge && (
                  <Chip label={cardCellarLabel} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-100/80">
            <div className="flex items-center gap-2">
              {typeof wine.avgRating === "number" && wine.avgRating > 0 && (
                <StaticStars rating={wine.avgRating} />
              )}
            </div>
            <span className="text-[11px] text-wine-400 font-medium">
              {wine.tastingCount ?? 0} smaksnotat{wine.tastingCount !== 1 ? "er" : ""}
            </span>
          </div>
        </div>
      </Link>
      {topRightSlot && (
        <div className="absolute top-2 right-2 z-10">{topRightSlot}</div>
      )}
    </div>
  )
}
