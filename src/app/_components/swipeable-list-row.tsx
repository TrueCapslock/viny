"use client"

/* eslint-disable react-hooks/refs -- The `react-hooks/refs` rule from
 * eslint-plugin-react-hooks v5+ flags any pattern where a ref is
 * returned from a custom hook and assigned to a JSX prop. This is a
 * false positive in React 19, where `ref` is a regular prop and the
 * pattern of "hook returns { ref, style, handlers }" is a valid way
 * to package gesture state for a row component. We access `ref.current`
 * only inside the touch event callbacks (never during render) and
 * render uses the `rowStyle`/`handlers` bags — none of which read
 * from `ref.current` at render time. */

import { type ReactNode } from "react"
import { useSwipeableRow } from "@/app/_components/use-swipeable-row"

/**
 * SwipeableListRow \u2014 a list row that reveals a left-anchored delete
 * action on swipe-right (mobile touch). The existing right-side trash
 * button stays in the DOM for keyboard / mouse users, so this is purely
 * additive.
 *
 * Layout (resting state):
 *
 *   \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
 *   \u2502  <row content: Link + always-visible trash>  \u2502  z-10
 *   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
 *   \u2502\u2502  (red Slett action sits behind, hidden) \u2502\u2502
 *
 * Layout (swiped open, translateX(72)):
 *
 *   \u250c\u2500\u2500\u2500\u2510\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
 *   \u2502Slett\u2502  <row content shifted right>   \u2502
 *   \u2514\u2500\u2500\u2500\u2518\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
 *
 * The `touch-action: pan-y` on the foreground layer (applied via
 * `useSwipeableRow`'s returned `rowStyle`) tells the browser to keep
 * vertical scroll free and surrender horizontal drags to the gesture \u2014
 * without it iOS Safari would rubber-band the X axis and fight the
 * swipe. The browser still fires click events on taps (no movement),
 * so the inner Link / trash button remain clickable when the user
 * isn't swiping.
 */
export function SwipeableListRow({
  children,
  onDelete,
  deleteLabel = "Slett",
}: {
  children: ReactNode
  onDelete: () => void
  deleteLabel?: string
}) {
  const swipe = useSwipeableRow<HTMLDivElement>()

  return (
    <div className="relative overflow-hidden">
      {/* Background: red Slett action, anchored to the LEFT so it's
          revealed as the foreground translates right. Sits behind the
          row content (no z-index; the foreground is the next sibling). */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="absolute inset-y-0 left-0 w-[72px] bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center active:from-red-600 active:to-red-700 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"
          />
        </svg>
      </button>

      {/* Foreground: the row content. Translates with the swipe. The
          useSwipeableRow hook applies touch-action: pan-y so vertical
          scroll still works. */}
      <div
        ref={swipe.ref}
        style={swipe.rowStyle}
        {...swipe.handlers}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  )
}
