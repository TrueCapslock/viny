"use client"

import { useEffect } from "react"

/**
 * iOS Safari auto-zooms the page on input focus when the input's
 * font-size is below 16px; the zoom sometimes lingers on blur and the
 * page ends up clipped ("lose the edges of the page"). The primary
 * cure lives in `globals.css` (a `@media (hover: none) (pointer:
 * coarse)` rule clamping input/select/textarea to ≥16px, which
 * stops the trigger). This hook is defense-in-depth: it captures
 * the window's scroll position on `focusin` and replays it on
 * `focusout` 120ms later, so even if a Safari webview does zoom,
 * the user lands back at the same scroll position when the keyboard
 * closes instead of stranded off-screen.
 *
 * Mounted once globally via <Providers>; the component renders
 * nothing. The 120 ms delay is intentional — Safari finalises the
 * layout after closing the keyboard on a later frame, and an
 * immediate scrollTo() is sometimes no-op'd.
 *
 * Side effect: scrollTo() with `behavior: "instant"` does no CSS
 * animation. We deliberately avoid "smooth" because the user is
 * cancelling an unwanted zoom and explicit animation would stack on
 * top of the keyboard-closing transition in an unpleasant way.
 */
export function ZoomRestoreOnFocusExit() {
  useEffect(() => {
    if (typeof window === "undefined") return

    let lastY =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0

    function capturePosition() {
      lastY =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
    }

    function restoreAfterZoom() {
      window.setTimeout(() => {
        try {
          window.scrollTo({
            top: lastY,
            left: 0,
            // "instant" is valid since ScrollBehavior spec 2024; safe
            // fallback for older browsers in the catch below.
            behavior: "instant" as ScrollBehavior,
          })
        } catch {
          window.scrollTo(0, lastY)
        }
      }, 120)
    }

    window.addEventListener("focusin", capturePosition)
    window.addEventListener("focusout", restoreAfterZoom)

    return () => {
      window.removeEventListener("focusin", capturePosition)
      window.removeEventListener("focusout", restoreAfterZoom)
    }
  }, [])

  return null
}
