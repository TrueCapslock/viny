"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Swipe-right-to-reveal gesture for mobile list rows.
 *
 * The hook tracks a horizontal touch drag on the wrapped row. As the
 * user drags right, the row's `transform: translateX` follows the
 * finger. Past a 72px threshold, the row locks open and a "delete"
 * affordance behind it becomes reachable. Below the threshold, the
 * row snaps back on release.
 *
 * The 72px threshold matches the recommended minimum touch-target
 * width (WCAG 2.5.5 / Apple HIG 44pt) so the revealed action is
 * comfortably tappable on release.
 *
 * `touch-action: pan-y` must be applied to the wrapped element (see
 * `swipeStyle` below) so the browser keeps vertical scroll free and
 * captures the horizontal drag for the gesture — without it iOS
 * Safari would rubber-band the X axis and fight the gesture.
 *
 * Desktop (no touch): `isSwiping` is never true and the touch
 * listeners are no-ops, so mouse/keyboard users see the row in its
 * resting state. The delete button stays reachable via the existing
 * trash icon (or any other always-visible affordance) for keyboard
 * parity.
 */
export function useSwipeableRow<T extends HTMLElement>(opts?: {
  /** Pixels of right-swipe past which the row locks open. Default 72. */
  threshold?: number
}) {
  const threshold = opts?.threshold ?? 72
  const ref = useRef<T | null>(null)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState(false)
  // `touching` tracks whether a finger is currently down on the row.
  // It mirrors the `startX.current !== null` invariant but lives in
  // state so the render-time `rowStyle` can read it without
  // dereferencing a ref (which the `react-hooks/refs` rule rightly
  // flags as an anti-pattern).
  const [touching, setTouching] = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    setTouching(true)
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current

      // If the gesture is dominantly vertical, let the browser handle
      // it (vertical scroll). Only commit to the horizontal gesture
      // once the user has clearly dragged sideways. This is the
      // standard "axis lock" pattern. We also reset the visual offset
      // so a partially-dragged row snaps back cleanly when the user
      // switches to a vertical scroll.
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        startX.current = null
        startY.current = null
        setOffset(0)
        setTouching(false)
        return
      }

      // Only respond to rightward drags. Ignore leftward (could be
      // opening another row's swipe, or a back-edge gesture).
      if (dx <= 0) {
        setOffset(0)
        return
      }

      // Apply rubber-band resistance past the threshold so over-drag
      // feels physical rather than elastic. Below threshold, full
      // 1:1 tracking.
      const next = dx < threshold ? dx : threshold + (dx - threshold) * 0.3
      setOffset(next)
    },
    // `threshold` is in the deps so a custom threshold that changes
    // between renders is picked up by the closure. For the current
    // single-callsite (no opts) it's a constant, but listing it keeps
    // the hook reusable without a stale-closure bug.
    [threshold],
  )

  const onTouchEnd = useCallback(() => {
    // If `touching` is already false, the axis-lock branch in
    // onTouchMove already released the row (reset offset + refs +
    // touching). onTouchEnd is still called by the browser on
    // touchend, but there's nothing to commit — skipping avoids
    // redundant state writes on the common touch-then-scroll flow.
    if (!touching) return
    startX.current = null
    startY.current = null
    setTouching(false)
    if (offset >= threshold) {
      setOpen(true)
      setOffset(threshold)
    } else {
      setOpen(false)
      setOffset(0)
    }
  }, [offset, threshold, touching])

  const close = useCallback(() => {
    setOpen(false)
    setOffset(0)
  }, [])

  // Inline style for the row's content layer. The visible row translates
  // by `offset`px; the action layer behind it stays anchored to the
  // right edge of the container.
  const rowStyle: React.CSSProperties = {
    transform: `translateX(${offset}px)`,
    transition: touching ? "none" : "transform 200ms ease-out",
    touchAction: "pan-y",
  }

  return {
    ref,
    rowStyle,
    open,
    offset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    close,
  }
}
