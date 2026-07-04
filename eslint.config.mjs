import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
