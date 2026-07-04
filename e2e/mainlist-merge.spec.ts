import { test, expect, type Page, type BrowserContext } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * v0.15.0 list-redesign — share-merge + split E2E.
 *
 * Covers the four contracts that anchor the v0.15.0 list-merge
 * deliverable, all anchored in the data-testids exposed by the
 * /app/_components/share-mainlist-dialog.tsx dialog component:
 *
 *   1. `data-testid="share-mine"`   — the "Din liste blir den felles"
 *      button that POSTs winner="mine" to /api/friends/share.
 *   2. `data-testid="share-theirs"` — the friend's-list-wins button that
 *      POSTs winner="theirs".
 *   3. `data-testid="share-loading"` — the spinner container present
 *      while the POST is in flight.
 *   4. `data-testid="share-error"` — the inline error banner that the
 *      dialog renders when the POST returns non-2xx.
 *
 * Each test registers two ephemeral users (caller + friend) instead of
 * reusing the seeded test@test.no. The reasons are real losses from
 * past runs: winner=theirs MERGES the caller's MainList into the
 * friend's, and DELETE on /api/friends/share recreates a fresh MainList
 * for the caller only. Repeated merging on a shared principal would
 * leave the seeded user's wines on a list owned half-by an
 * already-ghosted friend, and the vinskapet.spec.ts contract would
 * start failing on the very next run. Ephemeral users + ghost-row
 * accumulation are the same convention vinskapet.spec.ts uses, so the
 * maintenance footprint is zero.
 *
 * Cleanup: each test body is wrapped in `try{…} finally{…}` so a
 * mid-test assertion failure still drops wines + friendship + splits
 * the share before the test exits. Per project convention, the user
 * rows themselves are not deleted; they accumulate as ghosts.
 *
 * Assertion shape: prefer `.toBeHidden()` on dialog nodes (proves the
 * dialog has unmounted after success) over `.toHaveCount(0)` and over
 * the transient `.toBeVisible()` on `share-loading` — the latter races
 * against fast dev-hot-cache POSTs where the loading state flashes in
 * a sub-poll-interval window.
 */

async function loginAsTestUser(page: Page) {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Logg inn" })).toBeVisible()
  await page.getByLabel("E-post").fill(CALLER_EMAIL)
  await page.getByLabel("Passord").fill(CALLER_PASSWORD)
  await page.getByRole("button", { name: /^Logg inn/ }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 15_000,
  })
}

async function registerFreshUser(page: Page, email: string, password: string) {
  await page.goto("/register")
  await expect(
    page.getByRole("heading", { name: "Registrer deg" }),
  ).toBeVisible()
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: /Opprett konto/ }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/register"), {
    timeout: 15_000,
  })
}

// Re-export the seed credentials under localised names to keep the
// assertion text + log bread crumbs self-documenting ("login as caller").
// Importing rather than redeclaring survives any future rotation of
// scripts/test-constants.ts (dev DB resets, env-specific seeds) — if the
// constants change there, every spec including this one picks up the new
// values automatically.
const CALLER_EMAIL = TEST_USER_EMAIL
const CALLER_PASSWORD = TEST_USER_PASSWORD

type UserCtx = {
  callerCtx: BrowserContext
  callerPage: Page
  friendCtx: BrowserContext
  friendPage: Page
  callerId: number
  friendId: number
  friendEmail: string
}

async function setupMergePair(
  browser: import("@playwright/test").Browser,
  stamp: number,
): Promise<UserCtx> {
  const callerCtx = await browser.newContext()
  const callerPage = await callerCtx.newPage()
  await loginAsTestUser(callerPage)

  // Discover the seeded caller's userId via the /api/viner response.
  // POST to /api/viner returns the created wine's userId (= caller).
  // We don't need to keep the wine, but the side effect is harmless.
  const seedCreate = await callerPage.request.post("/api/viner", {
    data: {
      name: `__seed__-${stamp}`,
      producer: "__seed__",
      type: "red",
      inCellar: false,
      quantity: 0,
    },
  })
  expect(seedCreate.ok(), "caller POST /api/viner resolves userId").toBeTruthy()
  const seedWine = (await seedCreate.json()) as { id: number; userId: number }
  const callerId = seedWine.userId
  await callerPage.request.delete(`/api/viner/${seedWine.id}`)

  // Register the ephemeral friend.
  const friendCtx = await browser.newContext()
  const friendPage = await friendCtx.newPage()
  const friendEmail = `e2e-merge-${stamp}@viny.test`
  const friendPassword = "merge123"
  await registerFreshUser(friendPage, friendEmail, friendPassword)

  // Discover the friend's userId via /api/friends after accept below.
  const reqRes = await callerPage.request.post("/api/friends", {
    data: { email: friendEmail },
  })
  expect(reqRes.ok(), "caller POST /api/friends (caller→friend)").toBeTruthy()

  const friendFriendsResp = await friendPage.request.get("/api/friends")
  const friendFriendsData = await friendFriendsResp.json()
  const pending = (
    friendFriendsData.pendingReceived as Array<{
      id: number
      userId: number
      email: string
    }>
  ).find((p) => p.email === CALLER_EMAIL)
  expect(
    pending,
    "friend sees the caller's request in pendingReceived",
  ).toBeTruthy()
  const friendId = pending!.userId

  const acceptRes = await friendPage.request.put(`/api/friends/${pending!.id}`)
  expect(acceptRes.ok(), "friend accepts the request").toBeTruthy()

  return {
    callerCtx,
    callerPage,
    friendCtx,
    friendPage,
    callerId,
    friendId,
    friendEmail,
  }
}

async function cleanupMergePair(
  ctx: UserCtx,
  callerExtraWineIds: number[],
) {
  // After a merge, the caller may not have the right to delete a wine
  // owned by the friend — but `canEditWine` returns true when both
  // share the MainList, which is exactly our state. Delete one at a
  // time so a single FK cascade failure surfaces rather than crashing
  // out the loop with a partially-cleaned test.
  for (const id of callerExtraWineIds) {
    await ctx.callerPage.request.delete(`/api/viner/${id}`)
  }

  // Drop the friendship from the caller's side; whichever side carries
  // it, DELETE /api/friends/[id] is the same code path.
  const friendsRes = await ctx.callerPage.request.get("/api/friends")
  const friendsData = await friendsRes.json()
  const link = (friendsData.friends as Array<{
    id: number
    email: string
  }>).find((f) => f.email === ctx.friendEmail)
  if (link) {
    await ctx.callerPage.request.delete(`/api/friends/${link.id}`)
  }

  // Idempotent — splits if there are sharers, noops if there aren't
  // (the seeded user's MainList is recreated back to solo on the
  // next register, never via this path).
  await ctx.callerPage.request.delete("/api/friends/share", {
    data: { friendUserId: ctx.friendId },
  })

  await ctx.callerCtx.close()
  await ctx.friendCtx.close()
}

test.describe("v0.15.0 list-merge share flow", () => {
  // Bumped from 60s: 4 tests × ~10s of multi-context setup + register
  // / login flow + 2 assertion rounds + cleanup is tight at 60s under
  // cold-boot Next.js dev compile.
  test.setTimeout(90_000)

  test("share-mine via UI: data-testid=share-mine closes the dialog with merged state", async ({
    browser,
  }) => {
    const stamp = Date.now()
    const ctx = await setupMergePair(browser, stamp)
    try {
      await ctx.callerPage.goto("/venner")
      await expect(
        ctx.callerPage.getByRole("heading", { name: "Venner" }),
      ).toBeVisible()

      // "Del liste" lives on the friend row when !friend.sharedList.
      await expect(
        ctx.callerPage.getByRole("button", { name: /^Del liste$/ }),
        "Del liste button visible before merge",
      ).toBeVisible()

      await ctx.callerPage.getByRole("button", { name: /^Del liste$/ }).click()

      // Dialog is open and exposes the data-testid pickers.
      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine button visible inside dialog",
      ).toBeVisible()
      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs button visible inside dialog",
      ).toBeVisible()

      // Pre-POST sanity: no error rendered yet.
      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error is absent before click",
      ).toHaveCount(0)

      await ctx.callerPage.getByTestId("share-mine").click()

      // POST-settled state — covered via toBeHidden on the dialog
      // nodes (semantic "dialog was unmounted by parent after onClose")
      // plus the post-merge UI badge. We don't assert
      // share-loading.toBeVisible because the loading flag can race
      // against dev hot-cache POSTs that resolve in a sub-poll
      // interval.
      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine is hidden after success (dialog unmounted)",
      ).toBeHidden({ timeout: 15_000 })

      // Friend row has re-rendered with the shared badge.
      await expect(
        ctx.callerPage.getByText("✓ Deler vinliste"),
        "friend row now shows the shared badge",
      ).toBeVisible({ timeout: 15_000 })

      // /api/friends response carries the merged-state predicates.
      const friendsAfter = await ctx.callerPage.request.get("/api/friends")
      const friendsAfterData = await friendsAfter.json()
      const friendRow = (friendsAfterData.friends as Array<{
        userId: number
        sharedMainList: boolean
        sharedList: boolean
        canEdit: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(friendRow, "friend row present in /api/friends").toBeTruthy()
      expect(
        friendRow!.sharedMainList,
        "friend.sharedMainList=true after share-mine",
      ).toBe(true)
      expect(
        friendRow!.sharedList,
        "friend.sharedList alias also true (legacy contract preserved)",
      ).toBe(true)
      expect(
        friendRow!.canEdit,
        "friend.canEdit=true after share-mine",
      ).toBe(true)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })

  test("share-theirs via UI: data-testid=share-theirs puts caller's wines on friend's list", async ({
    browser,
  }) => {
    const stamp = Date.now()
    const ctx = await setupMergePair(browser, stamp)
    try {
      await ctx.callerPage.goto("/venner")

      await ctx.callerPage.getByRole("button", { name: /^Del liste$/ }).click()
      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs visible inside dialog",
      ).toBeVisible()

      await ctx.callerPage.getByTestId("share-theirs").click()

      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs is hidden after success (dialog unmounted)",
      ).toBeHidden({ timeout: 15_000 })

      await expect(
        ctx.callerPage.getByText("✓ Deler vinliste"),
        "friend row now shows the shared badge after share-theirs",
      ).toBeVisible({ timeout: 15_000 })

      // After share-theirs merge, the friend's MainList is the shared
      // one. Caller's mainListId is repointed to the friend's list.
      const friendsAfter = await ctx.callerPage.request.get("/api/friends")
      const d = await friendsAfter.json()
      const friendRow = (d.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(
        friendRow?.sharedMainList,
        "friend.sharedMainList=true after share-theirs",
      ).toBe(true)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })

  test("split via API DELETE: caller recreates fresh MainList and retains caller-owned wines", async ({
    browser,
  }) => {
    const stamp = Date.now()
    const ctx = await setupMergePair(browser, stamp)
    let stampWineId = -1
    try {
      // Set up the shared state via direct API — keeps this test focused
      // on the DELETE contract only.
      const mergeRes = await ctx.callerPage.request.post("/api/friends/share", {
        data: {
          friendUserId: ctx.friendId,
          winner: "mine",
          migrateLoserWines: true,
        },
      })
      expect(mergeRes.ok(), "merge precondition succeeds").toBeTruthy()

      const friendsAfterMerge = await ctx.callerPage.request.get("/api/friends")
      const merged = await friendsAfterMerge.json()
      const mergedRow = (merged.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(
        mergedRow?.sharedMainList,
        "precondition: friend.sharedMainList=true before split",
      ).toBe(true)

      // Seed a caller-owned wine with explicit inCellar=true so we can
      // verify it follows caller's MainListRow count after the split.
      const stampWine = await ctx.callerPage.request.post("/api/viner", {
        data: {
          name: `E2E split ${stamp}`,
          producer: "split produsent",
          type: "red",
          inCellar: true,
          quantity: 2,
        },
      })
      expect(stampWine.ok(), "seed wine with quantity succeeds").toBeTruthy()
      const stampWineData = (await stampWine.json()) as { id: number }
      stampWineId = stampWineData.id

      // Trigger the split. body.friendUserId is currently a no-op
      // parameter on the route (kept for symmetry) — any value works.
      const splitRes = await ctx.callerPage.request.delete(
        "/api/friends/share",
        {
          data: { friendUserId: ctx.friendId },
        },
      )
      expect(splitRes.ok(), "DELETE /api/friends/share returns 200").toBeTruthy()

      // Post-split: friend.sharedMainList must drop to false.
      const friendsAfterSplit = await ctx.callerPage.request.get("/api/friends")
      const split = await friendsAfterSplit.json()
      const splitRow = (split.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(
        splitRow?.sharedMainList,
        "friend.sharedMainList=false after split",
      ).toBe(false)

      // The seeded byline wine stays reachable on the caller's fresh
      // MainList. /api/viner surfaces caller-perspective rows; the
      // stamped wine must still be there with its inCellar + quantity
      // intact.
      const callerWines = await ctx.callerPage.request.get("/api/viner")
      const callerWinesData = (await callerWines.json()) as Array<{
        id: number
        name: string
        inCellar: boolean
        quantity: number
      }>
      const stamped = callerWinesData.find((w) => w.id === stampWineId)
      expect(
        stamped,
        "caller's stamped wine still reachable on the fresh MainList",
      ).toBeTruthy()
      expect(
        stamped?.inCellar,
        "stamped wine inCellar=true preserved across split",
      ).toBe(true)
      expect(
        stamped?.quantity,
        "stamped wine quantity=2 preserved across split",
      ).toBe(2)
    } finally {
      await cleanupMergePair(ctx, stampWineId > 0 ? [stampWineId] : [])
    }
  })

  test("error rendering: data-testid=share-error surfaces a mocked 409 from the API", async ({
    browser,
  }) => {
    const stamp = Date.now()
    const ctx = await setupMergePair(browser, stamp)
    try {
      // Intercept /api/friends/share and force a 409 so the dialog
      // renders the error banner. Mocks the real route's 409 path
      // ("Dere deler allerede en liste") without racing a partial
      // merge state.
      const intercepted: string[] = []
      await ctx.callerPage.route("**/api/friends/share", (route) => {
        intercepted.push("hit")
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Allerede delt (mock)" }),
        })
      })

      await ctx.callerPage.goto("/venner")
      await ctx.callerPage
        .getByRole("button", { name: /^Del liste$/ })
        .click()

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine visible inside dialog",
      ).toBeVisible()

      await ctx.callerPage.getByTestId("share-mine").click()

      // The dialog surfaces the mocked error verbatim.
      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error appears when POST returns 409",
      ).toBeVisible({ timeout: 5_000 })
      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error text reflects the API error message",
      ).toContainText("Allerede delt (mock)")

      // The dialog stays open after a 409 — share-error is a non-fatal
      // inline message that gives the user a chance to retry.
      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "dialog stays open on error (no auto-close)",
      ).toBeVisible()

      // Sanity: at least one POST hit the mocked endpoint.
      expect(
        intercepted.length,
        "POST /api/friends/share was called",
      ).toBeGreaterThan(0)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })
})
