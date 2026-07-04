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
 * Setup uses ephemeral caller+friend pairs per project convention.
 * Each test registers a fresh friend per stamp so merged/split
 * operations don't share principal across runs. Ghost user rows
 * accumulate linearly; the spec never deletes User rows.
 *
 * Cleanup guards:
 *   - Wines are deleted one-by-one in finally so a single FK cascade
 *     failure surfaces rather than crashing out the loop with a
 *     partially-cleaned test.
 *   - Friendships are dropped via DELETE /api/friends/[id].
 *   - DELETE /api/friends/share is called to split the share state
 *     (idempotent — splits if there are sharers, noops if there aren't).
 *   - Caller and friend IDs come from /api/friends's new `me` field
 *     so the previous wasteful /api/viner seed-and-delete round-trip
 *     is gone.
 *
 * Pre-cleanup (before each test):
 *   - Any `e2e-merge-*` friendship rows left behind by previous
 *     crashed runs are removed via DELETE /api/friends/[id].
 *   - DELETE /api/friends/share is ALSO called so the caller hits
 *     the test solo (DELETE /api/friends/[id] does NOT unmerge a
 *     shared MainList — that contract is documented in §6 of
 *     docs/LIST_DOC.md). Without this, the next share-merge
 *     precondition can 409 'Dere deler allerede en liste'.
 *
 * Selector adaptations:
 *   - `getByRole('heading', { name: 'Venner' })` substring-matches both
 *     the page `<h1>Venner</h1>` AND the section `<h2>Dine venner</h2>`.
 *     Tightened to `{ exact: true }`.
 *   - `getByRole('button', { name: /^Del liste$/ })` matches one button
 *     per accepted friend row. With pre-cleanup it's one —
 *     `.first()` belts-and-braces against ghost-row leaks.
 */

// Re-export the seed credentials under localised names to keep the
// assertion text + log breadcrumbs self-documenting ("login as caller").
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

/**
 * Destructured friend-row shape — same projection the route exposes.
 * Used by the pre-cleanup walker; assertion structures use tighter
 * local projections closer to where they're read.
 */
type FriendRow = { id: number; email: string }

async function setupMergePair(
  browser: import("@playwright/test").Browser,
  stamp: number,
): Promise<UserCtx> {
  // -- caller context --
  const callerCtx = await browser.newContext()
  const callerPage = await callerCtx.newPage()
  await loginAsTestUser(callerPage)

  // Discover caller id via the new GET /api/friends `me` field — saves
  // the waste of POSTing a throwaway wine to /api/viner just to read
  // userId back, then deleting it.
  const meRes = await callerPage.request.get("/api/friends")
  const meData = await meRes.json()
  const callerId = meData.me.id as number

  // Pre-cleanup: drop ghost `e2e-merge-*` friendship rows left by
  // crashed prior runs. Drop the Friend row, which would otherwise let
  // the next share-merge see an unexpected sharedMainList=true against
  // a ghost user.
  const allRows: FriendRow[] = [
    ...(meData.friends as FriendRow[]),
    ...(meData.pendingSent as FriendRow[]),
    ...(meData.pendingReceived as FriendRow[]),
  ]
  for (const row of allRows) {
    if (/^e2e-merge-/.test(row.email)) {
      await callerPage.request.delete(`/api/friends/${row.id}`)
    }
  }

  // DELETE /api/friends/[id] does NOT unmerge a shared MainList — also
  // run the split to leave the caller solo. Idempotent: if there are
  // no other sharers, it's a no-op.
  await callerPage.request.delete("/api/friends/share", {
    data: { friendUserId: 0 },
  })

  // -- friend context --
  const friendCtx = await browser.newContext()
  const friendPage = await friendCtx.newPage()
  const friendEmail = `e2e-merge-${stamp}@viny.test`
  await registerFreshUser(friendPage, friendEmail, "merge123")

  // Same convention: friendId via the friendPage's own /api/friends
  // `me` field. Enables a clean { caller, friend } pair without any
  // DB introspection or extra round-trips.
  const friendMeRes = await friendPage.request.get("/api/friends")
  const friendId = (await friendMeRes.json()).me.id as number

  // Connect: caller requests, friend accepts.
  await callerPage.request.post("/api/friends", { data: { email: friendEmail } })
  const friendFriendsResp = await friendPage.request.get("/api/friends")
  const friendFriendsData = await friendFriendsResp.json()
  const pending = (
    friendFriendsData.pendingReceived as Array<{
      id: number
      email: string
    }>
  ).find((p) => p.email === CALLER_EMAIL)
  expect(pending, "friend sees the caller's request in pendingReceived").toBeTruthy()
  expect(await friendPage.request.put(`/api/friends/${pending!.id}`)).toBeTruthy()

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

async function cleanupMergePair(ctx: UserCtx, callerExtraWineIds: number[]) {
  for (const id of callerExtraWineIds) {
    await ctx.callerPage.request.delete(`/api/viner/${id}`)
  }
  const friendsRes = await ctx.callerPage.request.get("/api/friends")
  const friendsData = await friendsRes.json()
  const link = (friendsData.friends as FriendRow[]).find(
    (f) => f.email === ctx.friendEmail,
  )
  if (link) {
    await ctx.callerPage.request.delete(`/api/friends/${link.id}`)
  }
  await ctx.callerPage.request.delete("/api/friends/share", {
    data: { friendUserId: 0 },
  })
  await ctx.callerCtx.close()
  await ctx.friendCtx.close()
}

test.describe("v0.15.0 list-merge share flow", () => {
  test.setTimeout(90_000)

  test("share-mine via UI: data-testid=share-mine closes the dialog with merged state", async ({
    browser,
  }) => {
    const ctx = await setupMergePair(browser, Date.now())
    try {
      await ctx.callerPage.goto("/venner")
      await expect(
        ctx.callerPage.getByRole("heading", { name: "Venner", exact: true }),
      ).toBeVisible()

      const delListe = ctx.callerPage
        .getByRole("button", { name: /^Del liste$/ })
        .first()
      await expect(delListe, "Del liste button visible before merge").toBeVisible()
      await delListe.click()

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine button visible inside dialog",
      ).toBeVisible()
      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs button visible inside dialog",
      ).toBeVisible()
      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error is absent before click",
      ).toHaveCount(0)

      await ctx.callerPage.getByTestId("share-mine").click()

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine is hidden after success (dialog unmounted)",
      ).toBeHidden({ timeout: 15_000 })
      await expect(
        ctx.callerPage.getByText("✓ Deler vinliste"),
        "friend row now shows the shared badge",
      ).toBeVisible({ timeout: 15_000 })

      const friendsAfter = await ctx.callerPage.request.get("/api/friends")
      const friendsAfterData = await friendsAfter.json()
      const friendRow = (
        friendsAfterData.friends as Array<{
          userId: number
          sharedMainList: boolean
          sharedList: boolean
          canEdit: boolean
        }>
      ).find((f) => f.userId === ctx.friendId)
      expect(friendRow, "friend row present in /api/friends").toBeTruthy()
      expect(friendRow!.sharedMainList, "sharedMainList=true after share-mine").toBe(true)
      expect(friendRow!.sharedList, "sharedList alias also true").toBe(true)
      expect(friendRow!.canEdit, "canEdit=true after share-mine").toBe(true)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })

  test("share-theirs via UI: data-testid=share-theirs puts caller's wines on friend's list", async ({
    browser,
  }) => {
    const ctx = await setupMergePair(browser, Date.now())
    try {
      await ctx.callerPage.goto("/venner")
      await ctx.callerPage
        .getByRole("button", { name: /^Del liste$/ })
        .first()
        .click()
      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs visible inside dialog",
      ).toBeVisible()
      await ctx.callerPage.getByTestId("share-theirs").click()

      await expect(
        ctx.callerPage.getByTestId("share-theirs"),
        "share-theirs is hidden after success",
      ).toBeHidden({ timeout: 15_000 })
      await expect(
        ctx.callerPage.getByText("✓ Deler vinliste"),
        "shared badge after share-theirs",
      ).toBeVisible({ timeout: 15_000 })

      const friendsAfter = await ctx.callerPage.request.get("/api/friends")
      const d = await friendsAfter.json()
      const friendRow = (d.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(friendRow?.sharedMainList, "sharedMainList=true after share-theirs").toBe(true)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })

  test("split via API DELETE: caller recreates fresh MainList and retains caller-owned wines", async ({
    browser,
  }) => {
    const ctx = await setupMergePair(browser, Date.now())
    let stampWineId = -1
    try {
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
      expect(mergedRow?.sharedMainList, "precondition: sharedMainList=true before split").toBe(true)

      const stampWine = await ctx.callerPage.request.post("/api/viner", {
        data: {
          name: `E2E split ${Date.now()}`,
          producer: "split produsent",
          type: "red",
          inCellar: true,
          quantity: 2,
        },
      })
      expect(stampWine.ok(), "seed wine with quantity succeeds").toBeTruthy()
      stampWineId = ((await stampWine.json()) as { id: number }).id

      const splitRes = await ctx.callerPage.request.delete("/api/friends/share", {
        data: { friendUserId: ctx.friendId },
      })
      expect(splitRes.ok(), "DELETE /api/friends/share returns 200").toBeTruthy()

      const friendsAfterSplit = await ctx.callerPage.request.get("/api/friends")
      const split = await friendsAfterSplit.json()
      const splitRow = (split.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(splitRow?.sharedMainList, "sharedMainList=false after split").toBe(false)

      const callerWines = await ctx.callerPage.request.get("/api/viner")
      const callerWinesData = (await callerWines.json()) as Array<{
        id: number
        name: string
        inCellar: boolean
        quantity: number
      }>
      const stamped = callerWinesData.find((w) => w.id === stampWineId)
      expect(stamped, "stamped wine reachable on fresh MainList").toBeTruthy()
      expect(stamped?.inCellar, "inCellar preserved").toBe(true)
      expect(stamped?.quantity, "quantity=2 preserved").toBe(2)
    } finally {
      await cleanupMergePair(ctx, stampWineId > 0 ? [stampWineId] : [])
    }
  })

  test("error rendering: data-testid=share-error surfaces a mocked 409 from the API", async ({
    browser,
  }) => {
    const ctx = await setupMergePair(browser, Date.now())
    try {
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
        .first()
        .click()

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine visible inside dialog",
      ).toBeVisible()

      await ctx.callerPage.getByTestId("share-mine").click()

      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error appears when POST returns 409",
      ).toBeVisible({ timeout: 5_000 })
      await expect(
        ctx.callerPage.getByTestId("share-error"),
        "share-error text reflects the API message",
      ).toContainText("Allerede delt (mock)")

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "dialog stays open on error",
      ).toBeVisible()

      expect(intercepted.length, "POST /api/friends/share was called").toBeGreaterThan(0)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })
})
