import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * v0.14.0 — per-user Vinskapet as a default SharedList.
 *
 * Friend-view smoke test that pins three downstream guarantees of the
 * schema migration + route updates:
 *
 *   1. The owner's Vinskapet wines show up for an accepted friend at
 *      `/venner/<ownerId>` (proves the new `$sharedListId ==
 *      $owner.defaultSharedListId` friend branch in `/api/viner` GET).
 *   2. Custom-list wines (`userId=owner, sharedListId=NULL`, e.g. the
 *      seeded "Testvin") do NOT leak to the friend.
 *   3. The per-wine `CellarToggle` is NOT rendered on the wine detail
 *      page when the viewer is a friend but not a `SharedListMember`
 *      (proves `canEdit` is `false` for read-only friends in
 *      `/app/viner/[id]/page.tsx` + the API GET gate).
 *
 * Setup uses the existing seeded test user as the "Owner" (so the
 * `Testvin` custom-list wine is already present and we don't need to
 * create our own custom-list wine). The cellar wine the test creates
 * is timestamped and removed during cleanup so re-runs start clean.
 *
 * Side effect: `registerFreshUser` creates a `e2e-friend-<stamp>@viny.test`
 * row every run; we don't delete the user on cleanup (no public API
 * exposes a delete-account surface, and direct prisma calls in tests are
 * a maintainability drag). Ghost rows accumulate linearly with runs and
 * are acceptable for the dev DB; if the DB ever needs a cleanup pass, a
 * `prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-friend-' }}})`
 * is a one-line mop.
 */

type VinerPostBody = {
  name: string
  producer: string
  vintage?: number
  type?: string
  inCellar: boolean
  quantity?: number
}

async function loginAsTestUser(page: Page) {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Logg inn" })).toBeVisible()
  await page.getByLabel("E-post").fill(TEST_USER_EMAIL)
  await page.getByLabel("Passord").fill(TEST_USER_PASSWORD)
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
  // The register page renders its inputs without explicit labels; we
  // rely on positional selectors scoped to the form so the test stays
  // robust against future label tweaks.
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: /Opprett konto/ }).click()
  await page.waitForURL(
    (u) => !u.pathname.startsWith("/register"),
    { timeout: 15_000 },
  )
}

test.describe("v0.14.0 friend-view permission contract", () => {
  test("cellar wines visible to friends; custom lists + CellarToggle are not", async ({
    browser,
  }) => {
    test.setTimeout(60_000)

    // ---------- ARRANGE — owner ----------
    const ownerCtx = await browser.newContext()
    const ownerPage = await ownerCtx.newPage()
    await loginAsTestUser(ownerPage)

    // Use a timestamped cellar wine so re-runs + leftover rows from a
    // crashed run never collide on assertions.
    const stamped = Date.now()
    const cellarWineName = `E2E Vinskapet Vin ${stamped}`

    // The owner adds a wine to their Vinskapet. POST /api/viner parks
    // it in `owner.defaultSharedListId` per the route's
    // `sharedListId: body.inCellar ? ownerDefaultSharedListId : null`
    // contract; the response surfaces `userId` so we can build the
    // friend-view URL without needing a separate "who am I" endpoint.
    const cellarWineRes = await ownerPage.request.post("/api/viner", {
      data: {
        name: cellarWineName,
        producer: "E2E Produsent",
        type: "red",
        inCellar: true,
        quantity: 1,
      } satisfies VinerPostBody,
    })
    expect(cellarWineRes.ok(), "POST /api/viner (cellar=true) succeeds").toBeTruthy()
    const cellarWine = await cellarWineRes.json()
    const ownerId: number = cellarWine.userId
    expect(
      typeof ownerId === "number" && ownerId > 0,
      "create response carries the owner userId",
    ).toBe(true)

    // Sanity guard: the owner's Vinskapet wines must include the wine
    // we just posted. If this fails the rest of the test is meaningless.
    const ownerWinesRes = await ownerPage.request.get("/api/viner")
    const ownerWines = (await ownerWinesRes.json()) as Array<{
      id: number
      name: string
      inCellar: boolean
      listId: number
    }>
    const createdRow = ownerWines.find(
      (w) => w.name === cellarWineName && w.id === cellarWine.id,
    )
    expect(createdRow, "owner sees the cellar wine on /").toBeTruthy()
    expect(createdRow?.inCellar, "createdRow.inCellar=true (parked in Vinskapet)").toBe(true)
    // v0.15.0: Wine.sharedListId is gone — cellaring state lives on
    // ListWine.inCellar/quantity, and the row's owning list is
    // surfaced via listId on the GET /api/viner response.
    expect(
      createdRow?.listId,
      "createdRow.listId set (parked on the owner's MainList)",
    ).toBeTruthy()

    // ---------- ARRANGE — ephemeral friend ----------
    const friendCtx = await browser.newContext()
    const friendPage = await friendCtx.newPage()
    const friendEmail = `e2e-friend-${stamped}@viny.test`
    const friendPassword = "friend123"
    await registerFreshUser(friendPage, friendEmail, friendPassword)

    // ---------- ARRANGE — friendship (owner → friend → accepted) ----------
    const reqRes = await ownerPage.request.post("/api/friends", {
      data: { email: friendEmail },
    })
    expect(reqRes.ok(), "POST /api/friends (owner→friend) succeeds").toBeTruthy()

    const friendListAfterReq = await friendPage.request.get("/api/friends")
    const friendListData = await friendListAfterReq.json()
    const pending = (friendListData.pendingReceived as Array<{
      id: number
      email: string
    }>).find((p) => p.email === TEST_USER_EMAIL)
    expect(
      pending,
      "friend sees the owner's request in pendingReceived",
    ).toBeTruthy()

    // Friend accepts. PUT on /api/friends/[id] flips status from
    // pending → accepted (see /api/friends/[id]/route.ts); this is the
    // public acceptance contract — note there's no separate /accept
    // subroute to hit.
    const acceptRes = await friendPage.request.put(
      `/api/friends/${pending!.id}`,
    )
    expect(acceptRes.ok(), "friend accepts the request").toBeTruthy()

    // ---------- ACT — friend opens the owner's wines ----------
    await friendPage.goto(`/venner/${ownerId}`)

    // ---------- ASSERT — owner identity + cellar visibility ----------
    await expect(
      friendPage.getByRole("heading", { name: /Test Bruker|test@test\.no/ }),
      "/venner/<id> renders the owner's name or email",
    ).toBeVisible()

    await expect(
      friendPage.getByText(cellarWineName),
      "owner's Vinskapet wine is visible to the friend",
    ).toBeVisible()

    // ---------- ASSERT — custom-list wines are NOT visible ----------
    // The seeded "Testvin" is the canary: it has userId=owner,
    // sharedListId=NULL, inCellar=false → it's a custom-list wine and
    // must NOT appear in the friend view.
    const friendWinesRes = await friendPage.request.get(
      `/api/viner?userId=${ownerId}`,
    )
    // Justify: the friend must have read access for the page to
    // render at all — a 404 here would mask the actual permission
    // contract we're testing.
    expect(
      friendWinesRes.ok(),
      "GET /api/viner?userId=<owner> returns 200 for accepted friend",
    ).toBeTruthy()
    const friendWinesForOwner = (await friendWinesRes.json()) as Array<{
      id: number
      name: string
    }>
    expect(
      friendWinesForOwner.some((w) => w.name === cellarWineName),
      "GET /api/viner?userId=<owner> includes the Vinskapet wine",
    ).toBe(true)
    expect(
      friendWinesForOwner.some((w) => w.name === "Testvin"),
      "GET /api/viner?userId=<owner> excludes the seeded Testvin custom-list wine",
    ).toBe(false)

    await expect(
      friendPage.getByText("Testvin"),
      "custom-list wine 'Testvin' is hidden from the friend view",
    ).toHaveCount(0)

    // ---------- ASSERT — detail page is readable but CellarToggle absent ----------
    await friendPage.goto(`/viner/${cellarWine.id}`)
    await expect(
      friendPage.getByRole("heading", { name: cellarWineName }),
      "friend can open the Vinskapet wine detail page",
    ).toBeVisible()
    // The wine-detail page renders CellarToggle only inside the
    // `canEdit && (...)` branch. Friend is not a SharedListMember of
    // the owner's Vinskapet under this scenario, so neither the pill
    // ("Legg i vinskap" + qty controls) nor the default gold-button
    // variant must render on the page.
    await expect(
      friendPage.getByRole("button", { name: /Legg i vinskap|Legg i ølkasse/ }),
      "CellarToggle 'add' button is not rendered for read-only friend",
    ).toHaveCount(0)
    await expect(
      friendPage.getByRole("button", { name: /Fjern én fra kjelleren|Legg til én i kjelleren/ }),
      "CellarToggle qty controls are not rendered for read-only friend",
    ).toHaveCount(0)

    // ---------- CLEANUP ----------
    // Delete the cellar wine we created so the seeded user's wines
    // list ends identical to the pre-test state.
    const delRes = await ownerPage.request.delete(`/api/viner/${cellarWine.id}`)
    expect(delRes.ok(), "cleanup: owner can delete the test cellar wine").toBeTruthy()

    // Drop the friendship from the owner's side so a re-run doesn't
    // see this friend twice.
    const ownerFriendsAfter = await ownerPage.request.get("/api/friends")
    const ownerFriendsData = await ownerFriendsAfter.json()
    const friendRow = (ownerFriendsData.friends as Array<{
      id: number
      email: string
    }>).find((f) => f.email === friendEmail)
    if (friendRow) {
      await ownerPage.request.delete(`/api/friends/${friendRow.id}`)
    }

    await ownerCtx.close()
    await friendCtx.close()
  })
})
