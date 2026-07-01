// Desktop sidebar dimensions. Must stay in sync with the Tailwind
// width classes used on the <aside> in src/app/_components/sidebar.tsx:
//   expanded → "w-64"        (= 256px)
//   collapsed → "w-[72px]"   (= 72px)
export const SIDEBAR_EXPANDED = "256px"
export const SIDEBAR_COLLAPSED = "72px"
export const SIDEBAR_DEFAULT = SIDEBAR_EXPANDED
export const SIDEBAR_STORAGE_KEY = "viny.sidebar.collapsed"
