// Desktop sidebar dimensions. Must stay in sync with the Tailwind
// width classes used on the <aside> in src/app/_components/sidebar.tsx:
//   expanded → "w-64"        (= 256px)
//   collapsed → "w-[64px]"   (= 64px)
// 64px chosen over the prior 72px: the tab content box (after nav p-3 +
// tab px-2) is exactly 24px wide in 64px (= room for a 24px icon, no
// inner breathing room needed for centering). Going below 64px would
// force a padding refactor; going to 72px+ leaves ~3:1 dead space next
// to a 24px icon and (paired with gap-3 + unsafe-center flex overflow)
// makes the icon visually drift ~6px off the bar's true center.
export const SIDEBAR_EXPANDED = "256px"
export const SIDEBAR_COLLAPSED = "64px"
export const SIDEBAR_DEFAULT = SIDEBAR_EXPANDED
export const SIDEBAR_STORAGE_KEY = "uva.sidebar.collapsed"
