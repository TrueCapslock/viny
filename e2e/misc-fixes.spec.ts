import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * v-next bug-fix pinning specs.
 *
 * Three contracts under test:
 *
 *   1. GET /api/viner dedupes by wine.id — a wine on both the MainList
 *      AND a Custom List surfaces ONCE (was: twice, "double up" UI bug).
 *
 *   2. ShareInvite cleanup — accepting or declining/cancelling a
 *      share-invite hard-deletes the ShareInvite row (was: status-flip
 *      to "accepted/declined/cancelled", leaving dead rows in the
 *      table indefinitely). We verify via the API's contract: a
 *      second DELETE / second POST on the same id returns 404 instead
 *      of 409 — the only discriminator between "row updated to
 *      terminal status" (old) and "row gone" (new) that's reachable
 *      from Playwright tests (which can't reliably load the generated
 *      Prisma client because it uses `import.meta`).
 *
 *   3. GET /api/users/search filters out ephemeral e2e-* test users,
 *      while still surfacing real users with non-e2e prefixes.
 */

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

async function createList(page: Page, name: string): Promise<number> {
  const res = await page.request.post("/api/lists", { data: { name } })
  expect(res.ok(), `POST /api/lists (${name}) succeeds`).toBeTruthy()
  const json = (await res.json()) as { id: number }
  expect(json.id).toBeGreaterThan(0)
  return json.id
}

async function deleteList(page: Page, id: number) {
  await page.request.delete(`/api/lists/${id}`)
}

test.beforeEach(async ({ page }) => {
  // Each test owns its own list / wine / friendship lifecycle and
  // uses timestamped names so re-runs can't collide on assertions.
  // Global teardown wipes leftover lists from prior runs.
  await loginAsTestUser(page)
})

test.describe("GET /api/viner dedupes by wine.id", () => {
  test("wine on MainList + Custom List surfaces ONCE", async ({ page }) => {
    const stamped = Date.now()
    const wineName = `E2E dedup vinskap ${stamped}`
    const listName = `E2E dedup liste ${stamped}`

    // Create a wine with inCellar=true on the MainList.
    const createRes = await page.request.post("/api/viner", {
      data: {
        name: wineName,
        producer: "dedup produsent",
        type: "red",
        inCellar: true,
        quantity: 1,
      },
    })
    expect(createRes.ok(), "POST /api/viner succeeds").toBeTruthy()
    const wineId = ((await createRes.json()) as { id: number }).id

    // Pin the same wine to a Custom List.
    const listId = await createList(page, listName)
    const pinRes = await page.request.post(`/api/viner/${wineId}/lists`, {
      data: { listId },
    })
    expect(pinRes.ok(), "pin wine to Custom List succeeds").toBeTruthy()

    // GET /api/viner — must return the wine ONCE, not twice.
    const fetchRes = await page.request.get("/api/viner")
    expect(fetchRes.ok(), "GET /api/viner succeeds").toBeTruthy()
    const wines = (await fetchRes.json()) as Array<{
      id: number
      name: string
      inCellar: boolean
      listId: number
    }>
    const matches = wines.filter((w) => w.id === wineId)
    expect(
      matches.length,
      "wine appears EXACTLY ONCE in view (was: twice, one per list)",
    ).toBe(1)
    expect(matches[0].inCellar, "dedup'd row preserves MainList inCellar=true").toBe(
      true,
    )

    // Cleanup — drop the pin first so list-delete doesn't strand an
    // orphan ListWine row, then the list, then the wine.
    await page.request.delete(`/api/viner/${wineId}/lists/${listId}`)
    await deleteList(page, listId)
    await page.request.delete(`/api/viner/${wineId}`)
  })

  test("wine NOT in cellar + on Custom List surfaces once with inCellar=false", async ({
    page,
  }) => {
    const stamped = Date.now()
    const wineName = `E2E dedup non-cellar ${stamped}`
    const listName = `E2E dedup non-cellar liste ${stamped}`

    // Wine NOT in cellar (inCellar=false on MainList).
    const createRes = await page.request.post("/api/viner", {
      data: {
        name: wineName,
        producer: "dedup non-cellar",
        type: "white",
        inCellar: false,
        quantity: 0,
      },
    })
    expect(createRes.ok(), "POST /api/viner (inCellar=false) succeeds").toBeTruthy()
    const wineId = ((await createRes.json()) as { id: number }).id

    const listId = await createList(page, listName)
    await page.request.post(`/api/viner/${wineId}/lists`, {
      data: { listId },
    })

    const fetchRes = await page.request.get("/api/viner")
    const wines = (await fetchRes.json()) as Array<{
      id: number
      name: string
      inCellar: boolean
      listId: number
    }>
    const matches = wines.filter((w) => w.id === wineId)
    expect(matches.length, "non-cellar wine on Custom List surfaces ONCE").toBe(1)

    await page.request.delete(`/api/viner/${wineId}/lists/${listId}`)
    await deleteList(page, listId)
    await page.request.delete(`/api/viner/${wineId}`)
  })

  test("friend-peek (?userId=<X>) never returns the same wine.id twice", async ({
    browser,
    page,
  }) => {
    // Defensive contract pin: friend-peek reads a single MainList, so
    // dedup is normally a no-op there. This stays in the suite so a
    // future change to the source filter (`listIdsToShow`) can't
    // silently introduce duplicates without breaking the test.
    const stamped = Date.now()
    const friendEmail = `e2e-dedup-friend-${stamped}@viny.test`
    const friendCtx = await browser.newContext()
    const friendPage = await friendCtx.newPage()
    await friendPage.goto("/register")
    await friendPage.locator('input[type="email"]').fill(friendEmail)
    await friendPage.locator('input[type="password"]').fill("dedup123")
    await friendPage.getByRole("button", { name: /Opprett konto/ }).click()
    await friendPage.waitForURL((u) => !u.pathname.startsWith("/register"), {
      timeout: 15_000,
    })

    try {
      // Connect & accept friendship.
      await page.request.post("/api/friends", { data: { email: friendEmail } })
      const pendingForFriend = (
        await (await friendPage.request.get("/api/friends")).json()
      ).pendingReceived as Array<{ id: number; email: string }>
      const pending = pendingForFriend.find((p) => p.email === TEST_USER_EMAIL)
      await friendPage.request.put(`/api/friends/${pending!.id}`)

      const ownerMe = ((await (await page.request.get("/api/friends")).json()).me) as {
        id: number
      }
      const wines = (await (
        await page.request.get(`/api/viner?userId=${ownerMe.id}`)
      ).json()) as Array<{ id: number }>
      const uniqueIds = new Set(wines.map((w) => w.id))
      expect(uniqueIds.size, "every wine.id in friend-peek is unique").toBe(wines.length)
    } finally {
      const link = (
        await (await page.request.get("/api/friends")).json()
      ).friends as Array<{ id: number; email: string }>
      const call = link.find((f) => f.email === friendEmail)
      if (call) await page.request.delete(`/api/friends/${call.id}`)
      await friendCtx.close()
    }
  })
})

test.describe("ShareInvite cleanup on terminal state", () => {
  test("accepting a share-invite hard-deletes the row (2nd accept -> 404)", async ({
    browser,
  }) => {
    const callerCtx = await browser.newContext()
    const callerPage = await callerCtx.newPage()
    await loginAsTestUser(callerPage)
    const stamped = Date.now()
    const friendEmail = `e2e-cleanup-${stamped}@viny.test`
    const friendCtx = await browser.newContext()
    const friendPage = await friendCtx.newPage()
    await friendPage.goto("/register")
    await friendPage.locator('input[type="email"]').fill(friendEmail)
    await friendPage.locator('input[type="password"]').fill("cleanup123")
    await friendPage.getByRole("button", { name: /Opprett konto/ }).click()
    await friendPage.waitForURL((u) => !u.pathname.startsWith("/register"), {
      timeout: 15_000,
    })

    try {
      await callerPage.request.post("/api/friends", { data: { email: friendEmail } })
      const pendingForFriend = (
        await (await friendPage.request.get("/api/friends")).json()
      ).pendingReceived as Array<{ id: number; email: string }>
      const pending = pendingForFriend.find((p) => p.email === TEST_USER_EMAIL)
      await friendPage.request.put(`/api/friends/${pending!.id}`)

      const friendMe = (
        await (await friendPage.request.get("/api/friends")).json()
      ).me as { id: number }

      const inviteRes = await callerPage.request.post("/api/friends/share-invite", {
        data: { friendUserId: friendMe.id, winner: "merge" },
      })
      expect(inviteRes.ok(), "POST /api/friends/share-invite (merge) succeeds").toBeTruthy()
      const inviteId = ((await inviteRes.json()) as { id: number }).id
      expect(inviteId, "invite id is positive").toBeGreaterThan(0)

      const firstAccept = await friendPage.request.post(
        `/api/friends/share-invite/${inviteId}/accept`,
      )
      expect(firstAccept.ok(), "first accept returns 201/200").toBeTruthy()

      // Hard-delete discriminator: a row that's status-flipped to
      // "accepted" would respond with 409 "Allerede besvart" on a
      // second accept; a hard-deleted row responds with 404.
      const secondAccept = await friendPage.request.post(
        `/api/friends/share-invite/${inviteId}/accept`,
      )
      expect(
        secondAccept.status(),
        "second accept returns 404 (hard-deleted), not 409 (status-flipped)",
      ).toBe(404)

      // Cleanup: split before dropping the friendship.
      await callerPage.request.delete("/api/friends/share", {
        data: { friendUserId: friendMe.id },
      })
      const link = (
        await (await callerPage.request.get("/api/friends")).json()
      ).friends as Array<{ id: number; email: string }>
      const call = link.find((f) => f.email === friendEmail)
      if (call) await callerPage.request.delete(`/api/friends/${call.id}`)
    } finally {
      await callerCtx.close()
      await friendCtx.close()
    }
  })

  test("declining (recipient) and cancelling (sender) hard-delete the row", async ({
    browser,
  }) => {
    const callerCtx = await browser.newContext()
    const callerPage = await callerCtx.newPage()
    await loginAsTestUser(callerPage)
    const stamped = Date.now()
    const friendEmail = `e2e-decline-${stamped}@viny.test`
    const friendCtx = await browser.newContext()
    const friendPage = await friendCtx.newPage()
    await friendPage.goto("/register")
    await friendPage.locator('input[type="email"]').fill(friendEmail)
    await friendPage.locator('input[type="password"]').fill("decline123")
    await friendPage.getByRole("button", { name: /Opprett konto/ }).click()
    await friendPage.waitForURL((u) => !u.pathname.startsWith("/register"), {
      timeout: 15_000,
    })

    try {
      await callerPage.request.post("/api/friends", { data: { email: friendEmail } })
      const pendingForFriend = (
        await (await friendPage.request.get("/api/friends")).json()
      ).pendingReceived as Array<{ id: number; email: string }>
      const pending = pendingForFriend.find((p) => p.email === TEST_USER_EMAIL)
      await friendPage.request.put(`/api/friends/${pending!.id}`)

      const friendMe = (
        await (await friendPage.request.get("/api/friends")).json()
      ).me as { id: number }

      // DECLINE (recipient path) — invite created, friend DELETE's it.
      const declineInvite = await callerPage.request.post(
        "/api/friends/share-invite",
        { data: { friendUserId: friendMe.id, winner: "merge" } },
      )
      expect(declineInvite.ok(), "decline-path invite created").toBeTruthy()
      const declineId = ((await declineInvite.json()) as { id: number }).id

      const firstDecline = await friendPage.request.delete(
        `/api/friends/share-invite/${declineId}`,
      )
      expect(firstDecline.ok(), "first DELETE (decline) returns 200").toBeTruthy()
      const secondDecline = await friendPage.request.delete(
        `/api/friends/share-invite/${declineId}`,
      )
      expect(
        secondDecline.status(),
        "second decline returns 404 (hard-deleted), not 409 (status-flipped)",
      ).toBe(404)

      // CANCEL (sender path) — invite created, caller DELETE's it.
      const cancelInvite = await callerPage.request.post(
        "/api/friends/share-invite",
        { data: { friendUserId: friendMe.id, winner: "merge" } },
      )
      const cancelId = ((await cancelInvite.json()) as { id: number }).id

      const firstCancel = await callerPage.request.delete(
        `/api/friends/share-invite/${cancelId}`,
      )
      expect(firstCancel.ok(), "first DELETE (cancel) returns 200").toBeTruthy()
      const secondCancel = await callerPage.request.delete(
        `/api/friends/share-invite/${cancelId}`,
      )
      expect(
        secondCancel.status(),
        "second cancel returns 404 (hard-deleted), not 409 (status-flipped)",
      ).toBe(404)

      // Cleanup the friendship.
      const link = (
        await (await callerPage.request.get("/api/friends")).json()
      ).friends as Array<{ id: number; email: string }>
      const call = link.find((f) => f.email === friendEmail)
      if (call) await callerPage.request.delete(`/api/friends/${call.id}`)
    } finally {
      await callerCtx.close()
      await friendCtx.close()
    }
  })
})

test.describe("friends-search hides ephemeral e2e-* users", () => {
  test("GET /api/users/search filters out e2e-* test users", async ({
    browser,
    page,
  }) => {
    // Create a fresh e2e-prefixed user with a searchable substring so
    // the post-fix can confirm the search excludes them by class, not
    // by coincidence. Note the literal hyphen in `e2e-search-`: the
    // filter is `email startsWith "e2e-"` and a missing hyphen would
    // let the test pass vacuously (the search would find the user
    // and the filter would also miss them, so the assertion holds
    // for the wrong reason).
    const stamped = Date.now()
    const ezTag = `e2e-search-${stamped}` // unique substring of the email
    const e2eEmail = `${ezTag}@viny.test`
    const e2eCtx = await browser.newContext()
    const e2ePage = await e2eCtx.newPage()
    await e2ePage.goto("/register")
    await e2ePage.locator('input[type="email"]').fill(e2eEmail)
    await e2ePage.locator('input[type="password"]').fill("search123")
    await e2ePage.getByRole("button", { name: /Opprett konto/ }).click()
    await e2ePage.waitForURL((u) => !u.pathname.startsWith("/register"), {
      timeout: 15_000,
    })

    try {
      // Search for the e2e user's email-local-part. Pre-fix this would
      // return the e2e user (filter didn't exist). Post-fix the email
      // starts with `e2e-` so the `NOT email startsWith "e2e-"` (with
      // mode: insensitive) predicate drops them from the results.
      const searchRes = await page.request.get(
        `/api/users/search?q=${encodeURIComponent(ezTag)}`,
      )
      expect(searchRes.ok(), "/api/users/search returns 200").toBeTruthy()
      const results = (await searchRes.json()) as Array<{ email: string }>
      expect(
        results.find((u) => u.email === e2eEmail),
        "e2e-prefixed user is filtered out of search results",
      ).toBeUndefined()
    } finally {
      await e2eCtx.close()
    }
  })

  test("GET /api/users/search still surfaces real (non-e2e) users", async ({
    page,
  }) => {
    // Belt-and-braces: the seeded test user (test@test.no / "Test
    // Bruker") is a baseline fixture that mirrors a real account; the
    // filter must NOT classify it as a test user. Pin the positive
    // path so a future change to the filter can't accidentally
    // over-sweep real users.
    const searchRes = await page.request.get(
      `/api/users/search?q=${encodeURIComponent("Test")}`,
    )
    expect(searchRes.ok(), "search returns 200 for non-e2e query").toBeTruthy()
    const results = (await searchRes.json()) as Array<{
      email: string
      name: string | null
    }>
    expect(
      results.some((u) => u.name?.includes("Test") || u.email.includes("test")),
      "real 'Test' user still surfaces in search (filter targets e2e- prefix only)",
    ).toBe(true)
  })
})
