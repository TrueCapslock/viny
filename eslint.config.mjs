import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ─────────────────────────────────────────────────────────────────────
// eslint pinned to ^9 (not ^10) — unpin path
// ─────────────────────────────────────────────────────────────────────
// eslint-plugin-react@7.37.5 (bundled by eslint-config-next@16) still
// calls context.getFilename(), which ESLint 10 removed (kept as a
// compat shim through v9). Pinning eslint to ^9 keeps the
// `react/display-name` rule loadable; ESLint 10 crashes the loader
// with "contextOrFilename.getFilename is not a function".
//
// Unpin path: when eslint-plugin-react v8 lands with ESLint 10 support,
// bump eslint back to ^10, re-run `npx eslint` on any .tsx, confirm
// the display-name rule loads cleanly (no getFilename TypeError), then
// remove this comment.
//
// (Previously a `"//"`-prefixed string field in package.json documented
// this; the Vercel build environment parsed it as a dependency and
// failed with EINVALIDPACKAGENAME. Moved here where npm can't touch it.)
// ─────────────────────────────────────────────────────────────────────

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Relax rules that are over-defensive or produce too much noise for
  // the current codebase. Kept as "warn" (not "off") so the signal
  // still shows up in the lint output for future cleanup.
  //   - react-hooks/set-state-in-effect: the new react-hooks plugin
  //     (v7) flags every SWR-cache-mirror effect (e.g. the
  //     add-to-list-dialog's `setMembership(new Set(listIds))`),
  //     but the bailout-on-identical-state pattern means no
  //     cascading render actually happens — the rule is over-defensive
  //     for SWR-cache-mirror patterns. Tracked as a known issue.
  //   - @typescript-eslint/no-explicit-any: the codebase has
  //     legitimate `any` uses for third-party API response shapes
  //     and dynamic Prisma include projections; tightening requires
  //     a larger type-narrowing pass. Tracked as a known issue.
  //   - @next/next/no-img-element: the codebase uses raw <img> tags
  //     extensively (28 occurrences across components, pages, dialogs).
  //     Migrating to next/image requires width/height on every <img>,
  //     remotePatterns config for the Vercel Blob CDN, and a layout-
  //     shift audit. Tracked as a known issue — revisit in a dedicated
  //     commit that does the migration end-to-end.
  //   - @next/next/no-page-custom-font: the Material Symbols font is
  //     loaded via a <link> tag in layout.tsx. Migrating to
  //     next/font/google requires the CSS-class-to-font-class plumbing
  //     to be rewired (the current Icon component uses the CSS class
  //     to look up icon glyphs by name). Tracked as a known issue.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-page-custom-font": "warn",
    },
  },
]);

export default eslintConfig;
