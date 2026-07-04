import { test, expect } from "@playwright/test"

/**
 * Visual regression tests for transactional email templates.
 *
 * Each template is rendered inside an iframe on the /dev/emails
 * preview page. The iframe element carries a stable
 * `data-testid="email-<id>"` attribute that this test pins with
 * `toHaveScreenshot`. The baselines live next to the test under
 * `e2e/emails/<id>.png`.
 *
 * OS font rendering drift: baselines are generated on the same OS
 * the test runs on. If you regenerate on macOS and run in Linux
 * CI (or vice versa), the snapshot can mismatch on sub-pixel font
 * rendering. The `maxDiffPixelRatio: 0.02` slack absorbs the
 * typical drift. If a future template legitimately changes,
 * regenerate baselines with:
 *
 *   npx playwright test e2e/emails.spec.ts --update-snapshots
 *
 * Each template gets its own test in the describe-loop so a single
 * regression fails with an isolated, attributable report rather
 * than halting the whole suite.
 */
const TEMPLATES = ["reset-password"] as const

test.describe("email templates (visual regression)", () => {
  for (const id of TEMPLATES) {
    test(`${id} matches baseline`, async ({ page }) => {
      // The /dev/emails route is NODE_ENV-gated. The Playwright
      // webServer runs `npm run dev` which sets
      // NODE_ENV=development, so the route is reachable here
      // without ENABLE_EMAIL_PREVIEW.
      await page.goto("/dev/emails")

      const iframe = page.locator(`iframe[data-testid="email-${id}"]`)
      await expect(iframe, `iframe for ${id} is present`).toBeVisible()

      // The iframe uses srcDoc (synchronous, no network), so the
      // content is rendered as soon as the element is in the DOM.
      // toHaveScreenshot on an iframe locator captures the rendered
      // content via a bounding-box clip of the page screenshot, so
      // the fixed width/height set in src/app/dev/emails/page.tsx
      // keeps the clip stable across runs.
      await expect(iframe).toHaveScreenshot(`emails/${id}.png`, {
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})
