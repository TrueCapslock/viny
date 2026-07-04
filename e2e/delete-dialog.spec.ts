import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "../scripts/test-constants"

/**
 * Regression spec pinning the v-next "delete dialog hidden behind
 * other controls" bug fix.
 *
 * The fix moved src/app/_components/delete-button.tsx's confirm dialog
 * from a `fixed inset-0 z-50` inside the WineOverflowMenu subtree to
 * a `createPortal(..., document.body)` mount, so the dialog's
 * z-50 lands at the root stacking context and beats the bottom-sheet's
 * sibling z-10. Pre-fix the dialog was painted under the bottom-sheet
 * because the header's nested `relative z-10` ancestor trapped the
 * dialog's z-50.
 *
 * Pinned contracts:
 *   1. Dialog is mounted as a direct child of `<body>` (proves the
 *      portal escape worked -- a future regression that drops the
 *      createPortal will fail this assertion).
 *   2. Dialog is `position: fixed` with `z-index: 50` (proves the
 *      overlay renders at the top of the root stacking context).
 *   3. Pressing Escape dismisses the dialog (proves the keyboard
 *      handler is wired; pre-Escape-fix the menu's global Escape
 *      listener closed the menu but left the dialog up).
 *   4. Wine isn't actually deleted on cancel (proves the
 *      stopPropagation on the card keeps in-card clicks from
 *      bubbling up to the backdrop's dismiss-on-click handler and
 *      accidentally cancelling the delete).
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

async function createTempWine(page: Page) {
  const stamped = Date.now()
  const res = await page.request.post("/api/viner", {
    data: {
      name: `E2E delete dialog vin ${stamped}`,
      producer: "delete-dialog produsent",
      type: "red",
      inCellar: false,
      quantity: 0,
    },
  })
  expect(res.ok(), "POST /api/viner succeeds").toBeTruthy()
  const wine = (await res.json()) as { id: number; name: string }
  expect(wine.id, "created wine has positive id").toBeGreaterThan(0)
  return wine
}

test.describe("delete confirmation dialog stacking + dismissal", () => {
  test.beforeEach(async ({ page }) => {
    // Every test body hits `/api/viner` via page.request; an unauthed
    // request returns the Next.js login-page HTML (DOCTYPE prefix), which
    // res.json() then fails to parse. Log in FIRST so the session cookie
    // is set for every subsequent page.request call on this context.
    await loginAsTestUser(page)
  })

  test("dialog mounts at body root via portal, z-index 50, dismisses on Escape", async ({
    page,
  }) => {
    const wine = await createTempWine(page)

    try {
      // 1. Navigate to the wine detail page.
      await page.goto(`/viner/${wine.id}`)
      await expect(
        page.getByRole("heading", { name: wine.name }),
        "wine detail page renders the wine name",
      ).toBeVisible()

      // 2. Open the WineOverflowMenu (the "Mer" trigger button at the
      //    top-right of the hero).
      const merButton = page.getByRole("button", { name: "Mer" })
      await expect(merButton, "Mer overflow trigger is rendered").toBeVisible()
      await merButton.click()

      // 3. Click "Slett" inside the dropdown menu. The menu is a
      //    role=menu container; the DeleteButton's <button> carries
      //    the visible "Slett" label (and red icon).
      const slettButton = page.getByRole("menu").getByRole("button", { name: "Slett" })
      await expect(slettButton, "Slett menu item is rendered").toBeVisible()
      await slettButton.click()

      // 4. Dialog appears. role=dialog + aria-modal=true were added to
      //    the portaled div in delete-button.tsx; locating by role
      //    is the stable selector.
      const dialog = page.getByRole("dialog")
      await expect(dialog, "portal'd delete dialog is in the DOM").toBeAttached()
      await expect(dialog, "portal'd delete dialog is visible").toBeVisible()

      // 5. The dialog must be the root-level stacking-context mount
      //    that fixes the bug. Three precise conditions pin this; any
      //    one failing means the dialog has regressed to its
      //    pre-portal position and would be painted under the
      //    bottom-sheet.
      const stackInfo = await dialog.evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          parentTag: el.parentElement?.tagName ?? null,
          position: cs.position,
          zIndex: cs.zIndex,
          modalAttr: el.getAttribute("aria-modal"),
        }
      })
      expect(
        stackInfo.parentTag,
        "dialog must be portaled: direct parent is <body>, not a stacking-context ancestor",
      ).toBe("BODY")
      expect(
        stackInfo.position,
        "dialog must be position:fixed (full-viewport overlay)",
      ).toBe("fixed")
      expect(
        stackInfo.zIndex,
        "dialog must stack at z-50 so it beats the bottom-sheet's z-10",
      ).toBe("50")
      expect(
        stackInfo.modalAttr,
        "dialog has aria-modal=true for screen-reader announcement",
      ).toBe("true")

      // 6. Escape must close the dialog. Without the useEffect-bound
      //    keydown listener (added in the same fix) the menu's own
      //    Escape handler would close the menu and leave the dialog
      //    orphaned -- this assertion pins the keyboard parity.
      await page.keyboard.press("Escape")
      await expect(
        dialog,
        "Escape dismisses the dialog (regression pin for the keyboard handler)",
      ).not.toBeVisible()

      // 7. Wine must NOT have been deleted (we only opened and
      //    dismissed the dialog). Verify by re-fetching via the API
      //    and asserting the wine is still present.
      const afterRes = await page.request.get(`/api/viner/${wine.id}`)
      expect(afterRes.ok(), "GET /api/viner/[id] returns 200 (wine still exists)").toBeTruthy()
      const afterBody = (await afterRes.json()) as { id: number; name: string }
      expect(afterBody.id, "wine id is unchanged after dialog dismissal").toBe(wine.id)
    } finally {
      // Cleanup the temp wine.
      const del = await page.request.delete(`/api/viner/${wine.id}`)
      expect(del.ok(), "cleanup: temp wine deleted").toBeTruthy()
    }
  })

  test("Avbryt button inside the dialog card dismisses the dialog", async ({
    page,
  }) => {
    // Belt-and-braces: test #1 pins Escape-key dismissal, this one
    // pins the explicit Avbryt-button path so a future change that
    // accidentally removes the in-card Cancel button (or breaks its
    // click handler) is caught immediately. Both dismissal channels
    // matter: Escape for keyboard-driven cancel, Avbryt for the
    // pointer-driven happy path users typically take.
    const wine = await createTempWine(page)
    try {
      await page.goto(`/viner/${wine.id}`)
      await page.getByRole("button", { name: "Mer" }).click()
      await page
        .getByRole("menu")
        .getByRole("button", { name: "Slett" })
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()

      // Click Avbryt inside the dialog card (NOT the backdrop).
      await dialog.getByRole("button", { name: "Avbryt" }).click()
      await expect(dialog, "Avbryt dismisses the dialog").not.toBeVisible()
    } finally {
      // Cleanup must be ASSERTED, matching the first test's pattern. A
      // silent cleanup that fails (network blip, FK constraint, etc.)
      // leaks an orphan wine and pollutes the next test run.
      const del = await page.request.delete(`/api/viner/${wine.id}`)
      expect(del.ok(), "cleanup: temp wine deleted").toBeTruthy()
    }
  })

  test("clicking Slett inside the dialog actually deletes the wine (pins the mousedown race fix)", async ({
    page,
  }) => {
    // Pins the v-next "delete still does not work" bug:
    //
    //   The WineOverflowMenu registers a document-level `mousedown`
    //   outside-click listener that calls `setOpen(false)` whenever
    //   the mousedown target is not inside `ref.current`. Before the
    //   portal fix, the delete dialog rendered inside the menu subtree
    //   (`ref.current`) so a click on the dialog's Slett button didn't
    //   trigger `setOpen(false)`. After the portal fix, the dialog
    //   mounts on document.body -- outside `ref.current` -- and a
    //   `mousedown` on the dialog card now bubbles to the document,
    //   closes the menu, and unmounts <DeleteButton /> (cascade-
    //   unmounting the portaled dialog subtree too) BEFORE the
    //   subsequent `click` event fires. `handleDelete` never runs, so
    //   "delete still doesn't work".
    //
    //   Fix: onMouseDown stopPropagation on the dialog card, mirroring
    //   the existing onClick stopPropagation. The backdrop is
    //   intentionally left permissive so a click on the dim layer
    //   still cleanly collapses the menu state.
    //
    // This test mirrors the user-facing happy path: open Mer, click
    // Slett, click Slett inside the dialog, expect the wine to be
    // gone. Without the fix the click on the in-card Slett button is
    // silently swallowed by the premount -- the wine is NOT deleted
    // and the assertion fails.
    const wine = await createTempWine(page)

    try {
    await page.goto(`/viner/${wine.id}`)
    await expect(
      page.getByRole("heading", { name: wine.name }),
      "wine detail page renders the wine name",
    ).toBeVisible()

    await page.getByRole("button", { name: "Mer" }).click()
    await expect(
      page.getByRole("menu"),
      "overflow menu opens after clicking Mer",
    ).toBeVisible()
    await page
      .getByRole("menu")
      .getByRole("button", { name: "Slett" })
      .click()

    const dialog = page.getByRole("dialog")
    await expect(
      dialog,
      "confirmation dialog opens after clicking the Slett menu item",
    ).toBeVisible()

    // Click THE Slett button inside the dialog (NOT the one in the
    // menu dropdown). Scoping the locator to `dialog` is essential --
    // both the menuitem-trash and the in-card-confirm Slett buttons
    // carry the same visible name. Playwright auto-waits for the
    // dialog card's animate-scale-in to settle before the click lands.
    await dialog.getByRole("button", { name: "Slett" }).click()

    // handleDelete's success path does router.push("/") then
    // router.refresh(). Wait for the URL transition -- the dialog and
    // menu both un-mount after navigation, but the URL change is a
    // more robust signal that handleDelete actually reached the success
    // branch (vs. being silently swallowed by the mousedown race).
    await page.waitForURL((u) => u.pathname === "/", { timeout: 10_000 })

    // Final assertion: the wine must be gone. GET /api/viner/[id]
    // returns 404 for deleted wines.
    const afterRes = await page.request.get(`/api/viner/${wine.id}`)
    expect(
      afterRes.status(),
      "GET /api/viner/[id] returns 404 -- the wine was actually deleted",
    ).toBe(404)
    } finally {
      // Defensive cleanup in case the production fix regresses and
      // the click is again swallowed -- tolerate either successful
      // cleanup-delete (the fix worked and the test happened to
      // reach this branch without the assertion firing first) or
      // 404 (the test's own delete already removed the wine).
      const del = await page.request.delete(`/api/viner/${wine.id}`)
      expect(
        del.ok() || del.status() === 404,
        "cleanup: temp wine deleted (or already-deleted by the test)",
      ).toBeTruthy()
    }
  })
})
