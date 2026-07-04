import { test, expect, type Page, type BrowserContext } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * v0.15.1 list-redesign — INVITE-THEN-ACCEPT share flow.
 *
 * The v0.15.0 share flow let the inviter's first POST merge the two
 * MainLists immediately. v0.15.1 stages the merge behind a recipient
 * accept: clicking "Del liste" → winner picker creates a *pending*
 * ShareInvite row; the merge only happens when the recipient posts to
 * the share-invite accept endpoint.
 *
 * Tests exercise the four contracts anchored in the dialog's
 * data-testids (data-testid="share-mine" / "share-theirs" / "share-loading"
 * / "share-error"). POST targets changed from `/api/friends/share` to
 * `/api/friends/share-invite` — the rest of the test contracts are
 * identical.
 *
 * After invite creation, the caller page shows `share-row-pending`
 * instead of the "Del liste" button on the target friend row, and the
 * recipient's `/venner` page renders a "Delte-listeforespørsler" card
 * with `share-invite-accept` + `share-invite-decline` actions.
 *
 * Setup uses ephemeral caller+friend pairs per project convention.
 * Each test registers a fresh friend per stamp so merged/split
 * operations don't share principal across runs. Ghost user rows + ghost
 * share-invite rows accumulate linearly; the spec never deletes them.
 *
 * Cleanup guards (per test, in `cleanupMergePair`):
 *   - Wines are deleted one-by-one in finally so a single FK cascade
 *     failure surfaces rather than crashing out the loop with a
 *     partially-cleaned test.
 *   - Friend share-invites are dropped via DELETE /api/friends/share-invite/[id].
 *   - Friendship is dropped via DELETE /api/friends/[id].
 *   - DELETE /api/friends/share is called to split the share state
 *     (idempotent — splits if there are sharers, noops if there aren't).
 *   - Caller and friend IDs come from /api/friends's `me` field so the
 *     previous wasteful /api/viner seed-and-delete round-trip is gone.
 *
 * Pre-cleanup (before each test):
 *   - Any `e2e-merge-*` friendship rows left behind by previous
 *     crashed runs are removed via DELETE /api/friends/[id].
 *   - ALL pending share-invite rows involving the caller (sent or
 *     received) are dropped via DELETE /api/friends/share-invite/[id].
 *     Without this, prior crumbs from a crashed run would let the next
 *     invite pre-check succeed while leaving stale rows.
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

/**
 * Destructured share-invite row shape — same projection the route
 * exposes on /api/friends GET's pendingShareInvitesSent/Received.
 */
type InviteRow = { id: number }

async function setupMergePair(
  browser: import("@playwright/test").Browser,
  stamp: number,
): Promise<UserCtx> {
  // -- caller context --
  const callerCtx = await browser.newContext()
  const callerPage = await callerCtx.newPage()
  await loginAsTestUser(callerPage)

  // Discover caller id via the new GET /api/friends `me` field.
  const meRes = await callerPage.request.get("/api/friends")
  const meData = await meRes.json()
  const callerId = meData.me.id as number

  // Pre-cleanup: drop ghost `e2e-merge-*` friendship rows left by
  // crashed prior runs.
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

  // Pre-cleanup: drop ANY pending share-invites involving the caller
  // (sent or received). They could leak from prior crashed runs OR from
  // a previous test in this run whose friendPage didn't run
  // `cleanupMergePair`. The DELETE route works for both sender
  // (status="cancelled") and recipient (status="declined") since the
  // caller IS involved in every such invite.
  const allInviteRows: InviteRow[] = [
    ...(meData.pendingShareInvitesSent as InviteRow[]),
    ...(meData.pendingShareInvitesReceived as InviteRow[]),
  ]
  for (const inv of allInviteRows) {
    await callerPage.request.delete(`/api/friends/share-invite/${inv.id}`)
  }

  // DELETE /api/friends/[id] does NOT unmerge a shared MainList —
  // also run the split to leave the caller solo. Idempotent.
  await callerPage.request.delete("/api/friends/share", {
    data: { friendUserId: 0 },
  })

  // -- friend context --
  const friendCtx = await browser.newContext()
  const friendPage = await friendCtx.newPage()
  const friendEmail = `e2e-merge-${stamp}@viny.test`
  await registerFreshUser(friendPage, friendEmail, "merge123")

  // friendId via the friendPage's own /api/friends `me` field.
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

  // Drop any pending share-invites the caller might still have on
  // either side of the relationship. The DELETE route works for both
  // sender (status="cancelled") and recipient (status="declined") since
  // the caller IS involved in every such invite — so we drop
  // unconditionally without an email filter.
  const friendsRes = await ctx.callerPage.request.get("/api/friends")
  const friendsData = await friendsRes.json()
  for (const inv of [
    ...(friendsData.pendingShareInvitesSent as InviteRow[]),
    ...(friendsData.pendingShareInvitesReceived as InviteRow[]),
  ]) {
    await ctx.callerPage.request.delete(`/api/friends/share-invite/${inv.id}`)
  }

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

test.describe("v0.15.1 list-merge invite-then-accept flow", () => {
  test.setTimeout(90_000)

  test("callerPage gets 'Venter på svar' badge after share-mine, before friend accepts", async ({
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
      await expect(delListe, "Del liste button visible before invite").toBeVisible()
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

      // Dialog closes on successful POST (invite created; still pending).
      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "share-mine is hidden after success (dialog unmounted)",
      ).toBeHidden({ timeout: 15_000 })

      // Caller view now shows the friend row with a "Venter på svar" badge
      // instead of the Del liste button.
      await expect(
        ctx.callerPage.getByTestId("share-row-pending"),
        "share-row-pending badge appears on caller side",
      ).toBeVisible({ timeout: 15_000 })

      // Friend side: navigate to /venner as the recipient; the
      // "Delte-listeforespørsler" section appears with an accept button.
      await ctx.friendPage.goto("/venner")
      await expect(
        ctx.friendPage.getByTestId("share-invite-received"),
        "share-invite-received card appears on friend side",
      ).toBeVisible({ timeout: 15_000 })
      await expect(
        ctx.friendPage.getByTestId("share-invite-accept"),
        "share-invite-accept button visible on friend side",
      ).toBeVisible()

      // Friend clicks Godta — merge tx runs server-side.
      await ctx.friendPage.getByTestId("share-invite-accept").click()

      // callerPage is a separate Playwright browser context with its own
      // SWR cache; even a full `reload` + `goto("/venner")` is the
      // canonical re-mount path because the previous page-reload trick
      // alone has been flaky here. We first poll the API until the
      // sharedMainList contract is true (deterministic, cross-context),
      // THEN fresh-mount /venner and assert the UI badge via a stable
      // data-testid (more robust than the Unicode check-mark text match).
      await expect(async () => {
        const r = await ctx.callerPage.request.get("/api/friends")
        const d = await r.json()
        const row = (
          d.friends as Array<{ userId: number; sharedMainList: boolean }>
        ).find((f) => f.userId === ctx.friendId)
        expect(row?.sharedMainList, "API: sharedMainList=true after accept").toBe(true)
      }).toPass({ timeout: 15_000 })

      // Hard reload (not goto) so the page's JS context — including
      // SWR's in-memory cache — is wiped. goto to the same URL reuses
      // the context and can serve stale data through the brief refetch
      // window, masking the new sharedMainList=true state.
      await ctx.callerPage.reload()
      await expect(
        ctx.callerPage.getByTestId("share-row-shared"),
        "friend row now shows the shared badge after friend accepts",
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
      expect(friendRow!.sharedMainList, "sharedMainList=true after accept").toBe(true)
      expect(friendRow!.sharedList, "sharedList alias also true").toBe(true)
      expect(friendRow!.canEdit, "canEdit=true after accept").toBe(true)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })

  test("callerPage gets 'Venter på svar' badge after share-theirs, before friend accepts", async ({
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
        ctx.callerPage.getByTestId("share-row-pending"),
        "share-row-pending badge visible after share-theirs",
      ).toBeVisible({ timeout: 15_000 })

      // Friend accepts. Same cross-context caveat as the share-mine
      // test: poll the API first (deterministic), then re-mount caller
      // and assert via the stable data-testid.
      await ctx.friendPage.goto("/venner")
      await ctx.friendPage.getByTestId("share-invite-accept").click()

      await expect(async () => {
        const r = await ctx.callerPage.request.get("/api/friends")
        const d = await r.json()
        const row = (
          d.friends as Array<{ userId: number; sharedMainList: boolean }>
        ).find((f) => f.userId === ctx.friendId)
        expect(row?.sharedMainList, "API: sharedMainList=true after accept").toBe(true)
      }).toPass({ timeout: 15_000 })

      // Hard reload — see share-mine test for the rationale.
      await ctx.callerPage.reload()
      await expect(
        ctx.callerPage.getByTestId("share-row-shared"),
        "shared badge after share-theirs + friend accept",
      ).toBeVisible({ timeout: 15_000 })

      const friendsAfter = await ctx.callerPage.request.get("/api/friends")
      const d = await friendsAfter.json()
      const friendRow = (d.friends as Array<{
        userId: number
        sharedMainList: boolean
      }>).find((f) => f.userId === ctx.friendId)
      expect(friendRow?.sharedMainList, "sharedMainList=true after share-theirs accept").toBe(true)
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
      // Precondition: caller invites, friend accepts (UI is tested
      // elsewhere; here the API path is sufficient).
      const inviteRes = await ctx.callerPage.request.post(
        "/api/friends/share-invite",
        { data: { friendUserId: ctx.friendId, winner: "mine" } },
      )
      expect(inviteRes.ok(), "invite precondition succeeds").toBeTruthy()
      const inviteJson = await inviteRes.json() as { id: number }

      const acceptRes = await ctx.friendPage.request.post(
        `/api/friends/share-invite/${inviteJson.id}/accept`,
      )
      expect(acceptRes.ok(), "accept precondition succeeds").toBeTruthy()

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
      // v0.15.1: mock now targets the invite endpoint, not the merge
      // endpoint (which is no longer POST-able).
      await ctx.callerPage.route("**/api/friends/share-invite", (route) => {
        intercepted.push("hit")
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Allerede sendt (mock)" }),
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
      ).toContainText("Allerede sendt (mock)")

      await expect(
        ctx.callerPage.getByTestId("share-mine"),
        "dialog stays open on error",
      ).toBeVisible()

      expect(intercepted.length, "POST /api/friends/share-invite was called").toBeGreaterThan(0)
    } finally {
      await cleanupMergePair(ctx, [])
    }
  })
})
