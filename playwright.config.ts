import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the Uva smoke tests.
 *
 * - Single chromium project (one desktop viewport for the smoke run).
 * - workers: 1 / fullyParallel: false because the suite forces the seeded
 *   testuser and shares DB state across tests.
 * - `webServer` boots `npm run dev`. With `reuseExistingServer: !process.env.CI`,
 *   running locally with an already-up dev server attaches to it instead of
 *   starting a second one. CI gets a fresh dev server per run (timeout 120s
 *   to absorb cold Prisma generation).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
