import { countryFlag } from "@/lib/countries"

/**
 * Renders a flag emoji for a free-text country string.
 *
 * - Unknown / empty values: renders nothing (so callers can still
 *   display the raw country text without an orphan flag).
 * - Known values (Norwegian, English, or any alias from
 *   `src/lib/countries.ts`): renders the flag emoji with
 *   `aria-label="<Norwegian country>"` for screen readers and a
 *   `title` tooltip on hover.
 *
 * Sized at `text-base` so it visually balances the surrounding
 * `text-xs` / `text-[10px]` badges used throughout the wine UI.
 * No "use client" — safe in Server Components.
 */
export function CountryFlag({
  country,
  className,
}: {
  country: string | null | undefined
  className?: string
}) {
  const emoji = countryFlag(country)
  if (!emoji) return null
  // No forced font-size by default — let the emoji inherit the
  // surrounding text size (10px on the home badges, 12px on the
  // wine-detail pill, 12px inline on the new-wine search rows). The
  // `leading-none` prevents the emoji baseline dragging the row's
  // line-height taller than its neighbours, and `shrink-0` keeps the
  // flex layout from collapsing the flag if the badge wraps.
  return (
    <span
      aria-label={country ?? undefined}
      title={country ?? undefined}
      className={className ?? "leading-none shrink-0"}
    >
      {emoji}
    </span>
  )
}
