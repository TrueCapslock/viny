import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * Layout + visual regression tests for the desktop sidebar and the
 * flat heading layouts on /lister and /viner/ny.
 *
 * Background: prior to this batch the desktop sidebar had a real-world
 * off-axis bug (collapsed-mode brand `<img>` sat 5 px left of the
 * aside center / 5 px left of the first tab icon below it), and
 * /lister and /viner/ny carried a redundant `bg-wine-gradient
 * text-white px-4 pt-1 pb-10` header banner that didn't match the
 * rest of the app. The tests below pin every behavior that came out
 * of the regression fixes:
 *
 *   - 9e1acb7  fix(sidebar): center collapsed icons (safe-center)
 *   - 0d48283  brand: hand-designed grape + hop logos
 *   - 38aa54c  fix(lister, viner/ny): drop the red banner
 *   - d6b4e80  fix(sidebar): center the brand logo in collapsed mode
 *
 * Drift tolerances intentionally allow a 2 px slack on the
 * pixel-rounded bounding-rect values (Playwright's
 * `getBoundingClientRect` reports sub-pixel coordinates which we
 * round before comparing).
 */

async function loginAsTestUser(page: Page) {
  // Pin the desktop viewport BEFORE /login so the Sidebar renders
  // from first paint -- the lg breakpoint hides it on smaller widths.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Logg inn" })).toBeVisible()
  await page.getByLabel("E-post").fill(TEST_USER_EMAIL)
  await page.getByLabel("Passord").fill(TEST_USER_PASSWORD)
  await page.getByRole("button", { name: /^Logg inn/ }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 15_000,
  })
}

async function forceSidebarExpanded(page: Page) {
  // FIXME: if the sidebar provider ever starts writing additional
  // state stores (a CSS variable, an SWR cache key, a cookie, etc.),
  // clear those here too -- the reset must re-establish the
  // post-reload initial state of every store the provider reads.
  await page.evaluate(() => {
    localStorage.removeItem("uva.sidebar.collapsed")
    document.documentElement.removeAttribute("data-sidebar-collapsed")
  })
  await page.reload()
  await page.waitForLoadState("networkidle")
}

type Box = { x: number; w: number; cx: number }

async function readBox(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.x),
      w: Math.round(r.width),
      cx: Math.round(r.x + r.width / 2),
    }
  }, selector)
}

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page)
})

test.describe("desktop sidebar - brand logo", () => {
  test("uses the hand-designed /logo-uva.svg in wine mode", async ({ page }) => {
    await forceSidebarExpanded(page)
    const src = await page
      .locator('aside a[href="/"] img')
      .first()
      .getAttribute("src")
    expect(src, "expected the brand <img> to load /logo-uva.svg").toMatch(
      /\/logo-uva\.svg($|\?)/,
    )
  })

  test("centers the brand img in collapsed mode", async ({ page }) => {
    await forceSidebarExpanded(page)
    // Click the collapse toggle; the aside's `transition-[width]
    // duration-300 ease-in-out` (300 ms) animates from 256 to 64
    // px. We poll for the post-transition width with toHaveCSS
    // instead of a sleep, so the spec self-documents the success
    // criterion.
    await page
      .getByRole("button", { name: /kollaps sidebar|utvid sidebar/i })
      .click()
    await expect(page.locator("aside")).toHaveCSS("width", "64px", {
      timeout: 1000,
    })

    const aside = await readBox(page, "aside")
    const img = await readBox(page, 'aside a[href="/"] img')
    expect(aside, "aside present").not.toBeNull()
    expect(img, "brand img present").not.toBeNull()
    expect(aside!.w).toBe(64)
    // Brand img must align with the aside's center axis within 2 px.
    // Pre-fix bug was 5 px off (img center 27 vs aside content center
    // 31.5); the d6b4e80 fix lands at center 32.
    expect(
      Math.abs(aside!.cx - img!.cx),
      "brand img aligns with aside center axis",
    ).toBeLessThanOrEqual(2)
  })

  test("keeps the lockup left-aligned in expanded mode", async ({ page }) => {
    await forceSidebarExpanded(page)

    const img = await readBox(page, 'aside a[href="/"] img')
    expect(img, "brand img present").not.toBeNull()
    // brandDiv has px-5 (20 px side padding) in expanded mode, so the
    // brandLink (and its inner img) sit at x=20 with w=28. Tolerance
    // ±2 px protects the regression guard against any future
    // padding micro-tweak without dropping the assertion.
    expect(img!.w, "img width ≈28px").toBeGreaterThanOrEqual(27)
    expect(img!.w).toBeLessThanOrEqual(29)
    expect(img!.x, "img x≈20 in expanded mode").toBeGreaterThanOrEqual(18)
    expect(img!.x).toBeLessThanOrEqual(22)
  })

  test("brand and first-tab icon share the center axis in collapsed mode", async ({
    page,
  }) => {
    await forceSidebarExpanded(page)
    await page
      .getByRole("button", { name: /kollaps sidebar|utvid sidebar/i })
      .click()
    await expect(page.locator("aside")).toHaveCSS("width", "64px", {
      timeout: 1000,
    })

    const img = await readBox(page, 'aside a[href="/"] img')
    const firstTab = await readBox(page, "aside nav a")
    expect(img, "brand img present").not.toBeNull()
    expect(firstTab, "first nav tab present").not.toBeNull()
    // Both should sit at the aside's true center axis. The pre-fix
    // 5 px drift between brand and nav was the user-visible bug.
    expect(
      Math.abs(img!.cx - firstTab!.cx),
      "brand and nav share center axis",
    ).toBeLessThanOrEqual(2)
  })
})

test.describe("/lister and /viner/ny - flat heading layout (no red banner)", () => {
  // Old banner signature -- tightly scoped so the test fails the
  // moment anyone resurrects the `bg-wine-gradient text-white px-4
  // pt-1 pb-10` banner on either page.
  const bannerSelector = "div.bg-wine-gradient.text-white.px-4.pt-1.pb-10"

  test("/lister does NOT carry the bg-wine-gradient header banner", async ({
    page,
  }) => {
    await page.goto("/lister")
    expect(
      page.getByRole("heading", { name: "Lister" }),
      "h1 'Lister' is visible",
    ).toBeVisible()

    await expect(
      page.locator(bannerSelector),
      "banner element absent",
    ).toHaveCount(0)

    // h1 must use the flat text-wine-900 token. globals.css defines
    // --wine-900 = #722337 = rgb(114, 35, 55); the pre-fix banner
    // used text-white on the gradient. Asserting the exact RGB
    // catches regressions that turn the h1 to any other color too.
    const color = await page
      .getByRole("heading", { name: "Lister" })
      .evaluate((el) => getComputedStyle(el).color)
    expect(color, "h1 is wine-900").toBe("rgb(114, 35, 55)")
  })

  test("/viner/ny does NOT carry the bg-wine-gradient header banner", async ({
    page,
  }) => {
    await page.goto("/viner/ny")
    // Heading matches either "Ny vin" (wine mode) or "Nytt øl"
    // (beer mode). Assert exactly one so a future heading
    // duplication (e.g. accidentally rendering both) is caught.
    const heading = page.getByRole("heading", { name: /ny vin|nytt øl/i })
    await expect(
      heading,
      "exactly one mode-specific heading",
    ).toHaveCount(1)
    await expect(
      heading,
      "h1 'Ny vin' / 'Nytt øl' is visible",
    ).toBeVisible()

    await expect(
      page.locator(bannerSelector),
      "banner element absent",
    ).toHaveCount(0)
  })

  test("/lister shows a count chip in the heading row", async ({ page }) => {
    await page.goto("/lister")
    expect(
      page.getByRole("heading", { name: "Lister" }),
    ).toBeVisible()

    // The count-chip selector below uniquely identifies the rounded
    // pill in /lister/page.tsx (bg-wine-50 + border-wine-100 +
    // rounded-full).
    await expect(
      page.locator("span.bg-wine-50.border-wine-100.rounded-full"),
      "count chip in heading row",
    ).toBeVisible()
  })
})

test.describe("desktop sidebar - bottom accent (mode-driven sketch)", () => {
  test("wine mode + expanded: shows /sidebar-bg-wine.png; collapsed: hides", async ({
    page,
  }) => {
    await forceSidebarExpanded(page)

    // The bg class + data-sidebar-collapsed both live on the <nav>
    // (not the <aside>): the nav is the scroll-surface for the tab
    // list and the override rule scopes against the same element as
    // the className so the toggle fires on the right element.
    await expect(
      page.locator("nav.sidebar-bg-illustration").first(),
      "nav has the .sidebar-bg-illustration class applied",
    ).toBeVisible()

    // In wine mode + expanded the CSS variable resolves to the wine
    // asset URL at computed-style time; Playwright's toHaveCSS reads
    // the resolved `--sidebar-bg-image`, not the var() literal.
    await expect(
      page.locator("nav.sidebar-bg-illustration").first(),
    ).toHaveCSS("background-image", /\/sidebar-bg-wine\.png/, {
      timeout: 1000,
    })

    // The asset endpoint must serve the bytes -- a broken asset path
    // would otherwise silently leave the sidebar with just bg-white
    // and no visible change to regression-test against.
    const wine = await page.request.get("/sidebar-bg-wine.png")
    expect(wine.status(), "wine asset HTTP 200").toBe(200)
    const wineBytes = await wine.body()
    expect(wineBytes.length, "wine asset > 1 KB").toBeGreaterThan(1000)
    expect(
      [wineBytes[0], wineBytes[1], wineBytes[2], wineBytes[3]],
      "PNG magic header 89 50 4E 47",
    ).toEqual([0x89, 0x50, 0x4e, 0x47])

    // Collapse -> nav picks up data-sidebar-collapsed="true"; the
    // override rule sets background-image: none on the SAME element.
    await page
      .getByRole("button", { name: /kollaps sidebar|utvid sidebar/i })
      .click()
    await expect(page.locator("aside")).toHaveCSS("width", "64px", {
      timeout: 1000,
    })
    await expect(
      page.locator("nav.sidebar-bg-illustration").first(),
    ).toHaveCSS("background-image", "none", { timeout: 1000 })
  })

  test("beer mode: bg swaps to /sidebar-bg-beer.png via html[data-beer]", async ({
    page,
  }) => {
    await forceSidebarExpanded(page)

    // Toggle the document-level flag manually. We don't flip the
    // React state -- CSS cascade re-evaluates the
    // `html[data-beer="true"]` rule on attr change, and the
    // var(--sidebar-bg-image) resolves at computed-style time.
    // The BeerModeProvider writes the attr from session.user.prefersBeer
    // only on mount/isBeer change -- these don't fire mid-test, so
    // our manual attr sticks until we restore it below.
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-beer", "true")
    })

    await expect(
      page.locator("nav.sidebar-bg-illustration").first(),
    ).toHaveCSS("background-image", /\/sidebar-bg-beer\.png/, {
      timeout: 1000,
    })

    const beer = await page.request.get("/sidebar-bg-beer.png")
    expect(beer.status(), "beer asset HTTP 200").toBe(200)
    const beerBytes = await beer.body()
    expect(beerBytes.length, "beer asset > 1 KB").toBeGreaterThan(1000)
    expect(
      [beerBytes[0], beerBytes[1], beerBytes[2], beerBytes[3]],
      "PNG magic header 89 50 4E 47",
    ).toEqual([0x89, 0x50, 0x4e, 0x47])

    // Restore so we don't leak the attr to any test that runs after.
    // Setting to "false" matches the BeerModeProvider's default branch
    // for non-preferring users.
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-beer", "false")
    })
  })
})
