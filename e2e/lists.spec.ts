import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_WINE_NAME,
} from "../scripts/test-constants"

/**
 * Smoke tests for the personal-lists flow.
 *
 * Two paths are covered, both with the same UI-driven credentials login
 * (no JWT faking — the real NextAuth credentials flow runs):
 *
 *  1. "create-then-add" — the literal user spec: create a list on /lister,
 *     navigate to a wine's detail page, add it to the new list via the
 *     dialog, verify it shows up on /lister/[id], then delete the list.
 *
 *  2. "inline-create" — open the dialog on /viner/[id] and create a new
 *     list from inside the dialog. This exercises the `addWineId` branch
 *     of POST /api/lists, which is a different code path with distinct
 *     rollback semantics.
 *
 * Both tests share a `beforeEach` that logs in as the seeded test user
 * and wipes any leftover lists, so they run against a clean slate.
 */

async function cleanupLists(page: Page) {
  const res = await page.request.get("/api/lists")
  if (!res.ok()) return
  const lists = (await res.json()) as Array<{ id: number }>
  for (const l of lists) {
    await page.request.delete(`/api/lists/${l.id}`)
  }
}

async function loginAsTestUser(page: Page) {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Logg inn" })).toBeVisible()
  await page.getByLabel("E-post").fill(TEST_USER_EMAIL)
  await page.getByLabel("Passord").fill(TEST_USER_PASSWORD)
  await page.getByRole("button", { name: /Logg inn/ }).click()
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 15_000 },
  )
}

async function findTestWine(page: Page) {
  const winesRes = await page.request.get("/api/viner")
  expect(winesRes.ok()).toBeTruthy()
  const wines = (await winesRes.json()) as Array<{ id: number; name: string }>
  const testWine = wines.find((w) => w.name === TEST_WINE_NAME)
  expect(testWine, `Seeded ${TEST_WINE_NAME} should exist`).toBeTruthy()
  return testWine!
}

test.beforeEach(async ({ page }) => {
  // The list-detail page uses window.confirm() for delete — auto-accept.
  page.on("dialog", (dialog) => dialog.accept())
  await loginAsTestUser(page)
  await cleanupLists(page)
})

test("personal-lists flow: create → add wine → verify → delete", async ({ page }) => {
  const testWine = await findTestWine(page)

  // 1. Create a list from /lister.
  await page.goto("/lister")
  await expect(page.getByRole("heading", { name: "Lister" })).toBeVisible()

  const listName = `E2E sig ${Date.now()}`
  await page.getByPlaceholder("Ny vinliste...").fill(listName)
  await page.getByRole("button", { name: "Opprett" }).click()

  // 2. After create, we land on /lister/{id} with 0 wines.
  await page.waitForURL(/\/lister\/\d+$/, { timeout: 10_000 })
  const listId = page.url().match(/\/lister\/(\d+)/)?.[1]
  expect(listId, "Should navigate to the new list's detail page").toBeTruthy()

  await expect(page.getByRole("heading", { name: listName })).toBeVisible()
  await expect(page.getByText(/^0 viner$/)).toBeVisible()

  // 3. Open the wine detail page and add the wine via the dialog.
  await page.goto(`/viner/${testWine.id}`)
  await expect(page.getByRole("heading", { name: TEST_WINE_NAME })).toBeVisible()

  await page.getByRole("button", { name: "Legg i liste" }).click()
  // Dialog row carries the list name + count. A RegExp is more explicit
  // than a string match and stays robust to row-content changes.
  await page.getByRole("button", { name: new RegExp(listName) }).click()
  await page.getByRole("button", { name: "Lukk" }).click()

  // 4. Verify the wine is in the list on /lister/{id}.
  await page.goto(`/lister/${listId}`)
  await expect(page.getByRole("heading", { name: listName })).toBeVisible()
  await expect(page.getByText(TEST_WINE_NAME)).toBeVisible()
  await expect(page.getByText(/^1 vin$/)).toBeVisible()

  // 5. Delete the list — page uses window.confirm(), handled by the dialog listener.
  await page.getByRole("button", { name: "Slett liste" }).click()
  await page.waitForURL(/\/lister$/, { timeout: 10_000 })

  // 6. /lister should show the empty state. The production fix in
  //    lister/[id]/page.tsx invalidates the /api/lists SWR cache before
  //    navigating, so the index doesn't serve the just-deleted list
  //    from cache.
  await expect(page.getByText("Ingen lister ennå")).toBeVisible({
    timeout: 10_000,
  })
})

test("personal-lists: create list inline from the wine-detail dialog (addWineId)", async ({
  page,
}) => {
  const testWine = await findTestWine(page)

  await page.goto(`/viner/${testWine.id}`)
  await expect(page.getByRole("heading", { name: TEST_WINE_NAME })).toBeVisible()

  const listName = `E2E inline ${Date.now()}`

  // Open the dialog and create the list from inside it.
  await page.getByRole("button", { name: "Legg i liste" }).click()
  await page.getByPlaceholder("F.eks. Favoritt-viner").fill(listName)
  await page.getByRole("button", { name: "Opprett" }).click()

  // Inline-create success: the new list row appears in the dialog with a checkmark.
  await expect(
    page.getByRole("button", { name: new RegExp(listName) }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Lukk" }).click()

  // On /lister, the new list (sorted by updatedAt desc) is at the top.
  await page.goto("/lister")
  const listLink = page.getByRole("link", { name: new RegExp(listName) })
  await expect(listLink).toBeVisible()
  await listLink.click()
  await page.waitForURL(/\/lister\/\d+$/, { timeout: 10_000 })

  // The wine is already in the list because the create+add is atomic.
  await expect(page.getByRole("heading", { name: listName })).toBeVisible()
  await expect(page.getByText(TEST_WINE_NAME)).toBeVisible()
  await expect(page.getByText(/^1 vin$/)).toBeVisible()

  // Cleanup so the next run starts from a clean slate.
  await page.getByRole("button", { name: "Slett liste" }).click()
  await page.waitForURL(/\/lister$/)

  // Empty state after the invalidation-triggered revalidation (same
  // contract as the first test).
  await expect(page.getByText("Ingen lister ennå")).toBeVisible({
    timeout: 10_000,
  })
})
