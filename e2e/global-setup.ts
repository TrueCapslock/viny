import { execSync } from "node:child_process"

/**
 * Playwright global setup — runs once before any test.
 *
 * Spawns the existing `npm run seed:test` script (via `tsx`) instead of
 * importing the seed module directly: Playwright's loader compiles `.ts`
 * files to CommonJS, but the seed file uses `import.meta.url` (an ESM
 * feature), which throws `SyntaxError: Cannot use 'import.meta' outside
 * a module` when loaded as CJS. Shelling out lets `tsx` run the file
 * as native ESM and is fast (~1-2s).
 */
export default async function globalSetup() {
  execSync("npm run seed:test", {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "0" },
  })
}
