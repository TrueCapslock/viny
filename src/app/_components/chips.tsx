import type { ReactNode } from "react"

/**
 * A single chip atom — used by the wine-detail identity row, WineCard
 * (cellar list / lister / friends views), and future surfaces
 * (vinmonopolet-search results, wine-form tags, suggest-wine dialog).
 * Centralising the markup here means new surfaces stay consistent: same
 * padding, border radius, color tokens, and the inline flag / remove
 * affordances get one canonical treatment.
 */
export interface ChipProps {
  /** Primary text. Accepts ReactNode so `ModeTypeLabel`, a joined string, or iconographic labels all work. */
  label: ReactNode
  /** Emoji or icon shown to the right of the label (e.g. country flag). Rendered with a left margin. */
  flag?: ReactNode
  /**
   * Visual variant. `default` is cream-100/wine-700 (data chips:
   * country, type, identity). `inCellar` switches colours to the gold
   * palette for chips that signal cellar status without changing the
   * chip's geometry. Default falls back to `default`.
   */
  variant?: "default" | "inCellar"
  /**
   * Whether this chip exposes a remove affordance. When `true`,
   * renders an inline × button after the label. Independent of
   * `onRemove` so consumers can choose a different verb (drag-to-
   * remove, batch delete) without re-rendering the affordance.
   */
  removable?: boolean
  /** Click handler fired when the user presses the × button. */
  onRemove?: () => void
  /**
   * Plain-text override for screen-readers, used when the chip's `label`
   * isn't a plain string (e.g. a `<ModeTypeLabel>` JSX element). Defaults
   * to the string value of `label` when that's already a string; otherwise
   * the button falls back to a generic `Remove`. Lets the consumer opt
   * into a more descriptive `Remove Nøgne Ø`-style label without
   * duplicating text content into `label`.
   */
  accessibleLabel?: string
  /** Extra positioning / margin classes from the parent (added after the base classes). */
  className?: string
}

export function Chip({
  label,
  flag,
  variant = "default",
  removable = false,
  onRemove,
  accessibleLabel,
  className,
}: ChipProps) {
  const baseColors =
    variant === "inCellar"
      ? "bg-gold-50 text-gold-700 border-gold-200"
      : "bg-cream-100 text-wine-700 border-cream-200"

  // Build the screen-reader label for the × button. Use the consumer-
  // supplied `accessibleLabel` when present, otherwise coerce `label`
  // to a string when it's already a primitive. Falls back to a generic
  // "Remove" when `label` is JSX (ReactNode that string-coerces to
  // "[object Object]") and no override was supplied.
  const stringLabel = accessibleLabel ?? (typeof label === "string" ? label : undefined)
  const removeAriaLabel = stringLabel ? `Remove ${stringLabel}` : "Remove"

  return (
    <span
      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${baseColors} ${className ?? ""}`}
    >
      {label}
      {flag != null && (
        <span aria-hidden="true" className="ml-1.5">
          {flag}
        </span>
      )}
      {removable && (
        <button
          type="button"
          // Stop propagation so removable chips nested inside a clickable parent
          // (e.g. WineCard's wrapping <Link>, or any future row-level Link) don't
          // accidentally fire navigation when the user just wants to remove the chip.
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          aria-label={removeAriaLabel}
          className="ml-1.5 text-wine-400 hover:text-red-500 transition-colors"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
