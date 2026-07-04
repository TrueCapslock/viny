# LIST_DOC.md — v0.15.0 list-redesign

This document is the canonical reference for the v0.15.0 list model. It
supersedes the v0.14.x "SharedList" semantics described in pre-redesign
issues. Anyone touching `prisma/schema.prisma`, the `src/lib/access.ts`
policy, or any of `/api/viner*` / `/api/friends*` / `/api/lists*` routes
should treat this as the source of truth and update it in lock-step.

---

## 1. Overview — what changed and why

v0.14.x had three independent concepts glued together on `Wine` rows:

1. **Cellar state** — `Wine.inCellar` + `Wine.quantity`.
2. **Sharing** — an `n`-to-`n` `SharedList` + `SharedListMember` join with
   a per-wine `Wine.sharedListId` FK to the inherited row.
3. **Ownership / byline** — `Wine.userId`.

Three concepts sharing one row meant that every access decision had to
mix vineyard metadata with cellar state with sharing state, and the
"friend-of-owner can peek at cellar wines but cannot see private lists"
semantic was a multi-`prisma.findMany` walk. v0.15.0 collapses the
three concepts into two:

- **Cellar state** lives on `ListWine` (per-list membership row). It
  reads/writes alongside the membership row that already exists, so
  the cellar toggle is a single upsert.
- **Sharing** is implicit in two `User.mainListId`s pointing at the
  same `List.isMain=true` row. There is no `SharedList` table.

The result is one access decision (`src/lib/access.ts:wineAccess`)
returning `"edit" | "read" | "none"` per (wine, user), backed by a
short list of ListWine + friendship lookups.

### 1.1 What was removed in v0.15.0

| Removed                          | Reason                                                            |
| -------------------------------- | ----------------------------------------------------------------- |
| `model SharedList`               | Replaced by `User.mainListId` shared on a row.                    |
| `model SharedListMember`         | Replaced by the same shared MainList mechanism.                  |
| `model User.field defaultSharedListId` | Same.                                                         |
| `Wine.field inCellar`            | Moved to `ListWine.inCellar`.                                     |
| `Wine.field quantity`            | Moved to `ListWine.quantity`.                                     |
| `Wine.field sharedListId`        | `n`-to-`n` semantics gone; visibility is now ListWine-driven.     |
| `route /api/shared-lists/*`      | Subsumed by `/api/friends/share` POST (list-merge) + DELETE (split). |

---

## 2. Models

### 2.1 `User`

```prisma
model User {
  mainListId Int? @unique  // FK → List.id (the row with isMain=true for this user)
  // ...
}
```

- **Every user gets exactly one MainList.** The MainList is created in
  `/api/register`'s transaction (the route inserts the User, then
  creates one `List { isMain: true, userId }` row, then `update`s
  `User.mainListId = list.id`).
- Sharing is **two `User.mainListId` columns pointing at the same
  `List.id`** — no separate join table. `me.mainListId === friend.mainListId`
  is the only condition anywhere in the codebase that asserts a share.
- `mainListId` is `@unique` because each user owns exactly one MainList
  at any point in time.

### 2.2 `List`

```prisma
model List {
  id        Int    @id @default(autoincrement())
  name      String
  userId    Int?           // metadata owner; SetNull on User delete
  isMain    Boolean @default(false)
  // ...
  wines     ListWine[]

  @@index([userId, isMain])
}
```

- **`isMain=true` rows are MainLists** — exactly one per user at any
  moment, but N-pointing-at-the-same-row when shared with N-1 friends.
- **`isMain=false` rows are Custom Lists** — classic personal
  collections of wines; not shareable.
- **`List.userId` is the metadata owner.** Only the metadata owner can
  rename / delete a Custom List. The `onDelete: SetNull` keeps a
  shared MainList alive when one partner deletes their User row — the
  partner's `User.mainListId` keeps pointing at the row; only
  `List.userId` (the bookkeeping owner) goes null.

### 2.3 `ListWine` — the cellar + membership row

```prisma
model ListWine {
  listId   Int
  wineId   Int
  inCellar Boolean  @default(false)
  quantity Int      @default(0)
  addedAt  DateTime @default(now())

  list     List @relation(fields: [listId], references: [id], onDelete: Cascade)
  wine     Wine @relation(fields: [wineId], references: [id], onDelete: Cascade)

  @@id([listId, wineId])    // composite PK
  @@index([listId])
  @@index([wineId])
}
```

- **Composite primary key `(listId, wineId)`** — the same wine cannot
  appear twice on the same list. Cross-list appearances are allowed:
  a wine can live on its MainList, on friends' shared MainList, and
  on any number of Custom Lists simultaneously. This is the
  asymmetry that drives the merge collision-handling policy (see §4.1).
- **`inCellar` + `quantity` are per-list, not per-wine.** "Cellar"
  is an editorial position relative to a list. A wine can be "in
  cellar" on Bob's MainList but not on Bob's "Birthday Wines" Custom
  List. The friend-peek view in `/viner/[id]` shows the **caller's**
  per-list view, not the owner's, when caller has edit rights.
- **`addedAt` is the list-membership timestamp**, exposed as the
  default sort key in `/api/lists/[id]/route.ts` GET (most-recently-
  added wines first).

### 2.4 `Wine`

```prisma
model Wine {
  userId Int           // BYLINE — which user created the row
  // (inCellar, quantity, sharedListId REMOVED, see §1.1)
  inLists ListWine[]   // the Wine↔ListWine inverse relation
  // ...
}
```

- **`Wine.userId` is byline only.** It records who first created the
  row, not who owns it for editing purposes. Editing is decided by
  ListWine membership on the caller's MainList (see §3).
- **`inLists` is the schema-side inverse** of `ListWine.wine`. It is
  used by `prisma.wine.deleteMany({ where: { id, inLists: { none: {} } } })`
  so a Wine row is only deleted when no `ListWine` references it
  remain across any list (custom lists, share-merge lists, etc.).
- **Tastings are still per-Wine** (`Tasting.wineId → Wine.id` Cascade).
  Removing a wine from a list does not delete its tastings.

---

## 3. Access policy — `src/lib/access.ts`

There is one canonical access function: `wineAccess(wineId, userId)`.
Every `/api/*` route that touches a wine by id funnels through this
helper. Anything that wants a yes/no edit gate uses `canEditWine`
directly.

```ts
export type WineAccess = "none" | "read" | "edit"
```

### 3.1 Edit gate

`canEditWine(wineId, userId)` returns `true` when **either**:

1. The caller is the byline owner (`wine.userId === userId`).
2. The caller's MainList already has a `ListWine(wine)` row. This
   covers the share-merge case: both users point `User.mainListId` at
   the same `List.id`, so the caller's `ListWine` membership exists
   and grants edit even though the caller's `wine.userId !== caller`.

Friends who only "peek" (read access below) are NOT edit. A friend
who pinned someone else's wine into their own Custom List is NOT
edit on the byline owner's behalf — they only have their pinner's
read access.

### 3.2 Full access decision

`wineAccess(wineId, userId)` returns the highest applicable tier:

| Tier | Condition                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------- |
| edit | `canEditWine(wineId, userId)` (above)                                                                |
| read | any `ListWine(wineId)` whose list is owned by caller (`list.userId === caller` and `isMain` any)      |
| read | caller is an accepted `Friend` of `wine.userId` AND a `ListWine(wineId, listId=owner.mainListId)` exists |
| none | otherwise                                                                                            |

Read on a pinned wine surfaces the **pinner's** `inCellar` +
`quantity` (caller-perspective). Read in the friend-peek case
surfaces the **owner's** `ListWine(dataListId, wineId)` (read-only
mirror of the owner's cellar tunnel). The wire shape is always
`{ ...wine, inCellar, quantity }` regardless of perspective, so the
client UI doesn't know which case it is.

### 3.3 What "delete a wine" means now

`/api/viner/[id]/route.ts` DELETE drops the `(callerMainList, wine)`
`ListWine` row first. Then, atomically, the `Wine` row is deleted
via:

```ts
prisma.wine.deleteMany({
  where: {
    id: wineId,
    // Wine↔ListWine inverse relation declared in prisma/schema.prisma
    // on `Wine.inLists`. Postgres evaluates the `none` subquery
    // alongside the DELETE so a row is removed only if zero
    // ListWine refs survive; a concurrent row insert that commits
    // before us nulls the predicate at the SQL snapshot and the
    // Wine survives.
    inLists: { none: {} },
  },
})
```

This pushes the orphan check into a single SQL statement — we do
**not** do a `prisma.listWine.count({where:{wineId}}) → prisma.wine.delete`
two-step pattern, which is TOCTOU-racy under concurrent inserts /
merges. The atomic `deleteMany + inLists.none` predicate is the
canonical "delete with no live references" pattern across the
codebase; any new route that wants this guarantee should reach for
the same predicate.

Pinned-on-Custom-List preservation: if caller A is on shared
MainList X with friend B, and A removes wine W from X, B's pin of W
in their Custom List Y is preserved. W is only deleted when X *and*
Y (and any other lists) all lose their reference.

---

## 4. Friend share — POST `/api/friends/share`

### 4.1 Body + semantics

```
POST /api/friends/share
Body: { friendUserId: number, winner: "mine" | "theirs", migrateLoserWines: boolean }
201:  { mergedInto: number }
```

`winner` is **whose MainList becomes the post-merge shared one**:

- `winner: "mine"`   → caller's `User.mainListId` stays put; the
  friend's `User.mainListId` is repointed at the caller's MainList;
  the friend's old list is deleted.
- `winner: "theirs"` → friend's MainList stays put; the caller's
  `User.mainListId` is repointed at the friend's MainList; the
  caller's old list is deleted.

`migrateLoserWines`:

- `true`  → the loser's wines are bulk-relocated onto the winner list
  (see §4.2 collision handling). Defaults to `true` from the
  `share-mainlist-dialog.tsx` UI; we never silently destroy wines on
  a merge.
- `false` → the loser's list is dropped, and the FK cascade removes
  every `ListWine` row whose `listId` matches the loser's id. Any
  `Wine` that loses its last `ListWine` reference cascades-dies. This
  destructive path is reserved for an explicit "slett vennens" UX
  variant we have not yet shipped.

### 4.2 Collision handling (Phase 1 inside the tx)

The merge collision happens when the loser list and the winner list
have a same `wineId` in their `ListWine` rows. Phase 1 iterates the
collisions and applies this merge policy:

- `inCellar` becomes `winner.inCellar || loser.inCellar` (logical OR —
  either side saying "i mitt vinskap" wins).
- `quantity` becomes `winner.quantity + loser.quantity` (sum).
- The loser's `ListWine` row is deleted after the winner is updated;
  the loser's `Wine.userId` byline is unchanged.

Phase 2 then bulk-`updateMany`s the remaining non-colliding loser rows
to `listId = winnerListId`. The composite PK guarantees that after
Phase 1, no `(winnerListId, wineId)` collision exists for Phase 2
rows. Then the loser's `User.mainListId` is updated to
`winnerListId` and the now-empty loser list row is deleted.

### 4.3 Concurrency caveats (READ COMMITTED)

Phase 1 runs inside `prisma.$transaction`, which uses Postgres's
default READ COMMITTED isolation. The per-collision
`findMany → findUnique → update → delete` loop is safe against a
single in-flight transaction but **not** against two concurrent
POST `/api/friends/share` requests on the same pair of users
(e.g. a double-click race during a session refresh, or a
distributed caller + a webhook-style recompute):

- Two concurrent Phase 1 inner SELECTs can read a stale snapshot
  of the loser's `ListWine` rows — both then attempt to write the
  same (winnerListId, wineId) collision update. Postgres serialises
  the writes via row locks but the second writer's in-memory
  `w.inCellar || c.inCellar` computation is on top of a stale
  read, so the merged `quantity` can under- or over-count by the
  loser's contribution.
- A concurrent loser-row `delete` from the second txn finds zero
  rows affected (not a FK violation — the loser list has already
  been deleted by T1, and Phase 2's `updateMany` no-ops). The real
  failure is silent inventory drift: T2 overwrites T1's already-
  committed `winner.inCellar || loser.inCellar` and
  `quantity + quantity` calculations with values computed against
  its own stale snapshot, so the merged `ListWine` ends up with
  either a too-low or a too-high quantity + a flipped `inCellar`
  bit. There is no error; the data is just wrong.

Production mitigation plan (not shipped in v0.15.0): upgrade to
`prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`
only on this route, OR serialise the merge under a per-pair advisory
lock. The advisory-lock key MUST be **direction-canonicalised** — a
caller-side merge writes the key as
`'merge:' || min(caller, friend) || ':' || max(caller, friend)`
so a concurrent merge from the *other* sharer acquires the same lock
and waits, instead of having two parallel merges each holding a
different lock and proceeding in lockstep.

Scope: the canonicalised key **serializes direct-pair merges only**.
A three-way corner-cut A→C and C→B (running concurrently through a
shared intermediary C) would NOT block on the same lock because the
direct pairs are (A,C) and (C,B). Workers that need cross-pair
serialisation (e.g. an async batch that propagate merges across the
followers graph) should additionally scope the lock by the
candidate winner's `List.id` or use Serializable isolation.

Both are 1-line changes; new contributors adding
concurrent-merge-sensitive code should hold to the same pattern.

### 4.4 Pre-conditions + errors

`POST /api/friends/share` returns:

| Status | Body                                | Cause                                                |
| ------ | ----------------------------------- | ---------------------------------------------------- |
| 201    | `{ mergedInto: number }`            | Success — winner's list id returned.                 |
| 400    | `{ error: "Ugyldig forespørsel" }`  | Missing/invalid `friendUserId` or `winner`.          |
| 400    | `{ error: "Kan ikke dele med deg selv" }` | `friendUserId === userId`.                      |
| 403    | `{ error: "Ikke venner med denne brukeren" }` | Not an accepted Friend.               |
| 409    | `{ error: "Hovedlister ikke klare" }` | Either User lacks `mainListId` (rare).            |
| 409    | `{ error: "Dere deler allerede en liste" }` | Already share-merged.                    |

The `share-mainlist-dialog.tsx` component surfaces the 409 case via
`data-testid="share-error"`. On success, the dialog calls
`onShared(); onClose();` on the parent (`onShared` triggers an SWR
re-fetch via `mutateFriends()`; `onClose` resets the local state).

---

## 5. Friend share — DELETE `/api/friends/share`

### 5.1 Body + semantics

```
DELETE /api/friends/share
Body: { friendUserId: number }   // currently a no-op parameter, kept for symmetry
200:  { success: true }
```

This is the **split** half of the merge. The semantics are "caller
splits off from the shared MainList":

1. Look up other sharers on `me.mainListId` (i.e. users other than me
   whose `User.mainListId === me.mainListId`).
2. If no other sharers → no-op (`{ success: true }`).
3. Else → insert a fresh `List { name: "UseMainList", userId: caller,
   isMain: true }`. Move every `ListWine(listId=shared, wineId IN
   (Wine.userId = caller))` row onto the fresh list. Repoint
   `caller.User.mainListId` to fresh. The other sharers keep their
   `mainListId` on the old shared list, which is now half-orphaned.

The "move caller-owned wines" SQL is `ListWine.listId = fresh WHERE
listId = shared AND wineId IN (Wine.userId = caller)`. We move only
caller-bylined wines because the other sharers' byline wines stay on
the shared list (no ownership transfer during a split — only metadata
ownership of the list itself goes away).

### 5.2 Pre-conditions + errors

DELETE is idempotent: if there are no other sharers, the route is a
no-op. If the route runs against an un-shared MainList (e.g. an
extra-paranoid re-run), the route still returns `{ success: true }`
after the no-op floater check.

---

## 6. Routes — quick map

| Route                                | v0.15.0 role                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `/api/register` POST                 | Transaction: create User + create MainList + back-ref `User.mainListId`.                     |
| `/api/friends` GET                   | Returns `friends[]` with `sharedMainList` + `sharedList` + `canEdit` derived from `User.mainListId` comparison. Also `pendingSent` / `pendingReceived` / `sharedLists: []` for backward-comp with the v0.14.x client shape. |
| `/api/friends` POST                  | Send a friend-request to a target email.                                         |
| `/api/friends/[id]` PUT              | Accept a pending friend-request (flips `Friend.status` from `pending` → `accepted`).         |
| `/api/friends/[id]` DELETE           | Drop a friendship (or decline a pending request). Removes the `Friend` row only — does **not** unmerge a shared MainList (use DELETE `/api/friends/share` for that). |
| `/api/friends/share` POST            | List-merge (§4).                                                                              |
| `/api/friends/share` DELETE          | Split (§5).                                                                                   |
| `/api/viner` GET                     | Returns wines on caller's MainList + Custom Lists. Friend-peek (`?userId=X`) returns wines on X's MainList only; Custom-list wines are private to X. |
| `/api/viner` POST                    | Creates a Wine + a `ListWine(callerMainList, wine, inCellar, quantity)` in the same tx.        |
| `/api/viner/[id]` GET                | Funnels through `wineAccess(wineId, userId)`. Returns `{ ...wine, inCellar, quantity }` from caller-perspective on edit, owner-perspective on read (friend-peek). |
| `/api/viner/[id]` PUT                | Updates the Wine row + upserts the `(callerMainList, wine)` `ListWine(inCellar, quantity)`.  |
| `/api/viner/[id]` PATCH              | Pure cellar toggle — upserts only `ListWine(inCellar, quantity)` on caller's MainList.       |
| `/api/viner/[id]` DELETE             | Drops `(callerMainList, wine)` `ListWine`, then atomically deletes the Wine only when `inLists.nones` (see §3.3). |
| `/api/viner/[id]/lists` GET          | Returns the Custom-List IDs owned by caller that contain the wine (MainList is not a Custom List). |
| `/api/viner/[id]/lists` POST         | Add the wine to one of caller's Custom Lists (caller owns the Custom List — owner check, *not* an access-on-anyone's-behalf flow). |
| `/api/viner/[id]/lists/[listId]` DELETE | Remove a wine from one specific Custom List the caller metadata-owns. Owner-check is `List.userId` only — **byline-independent**: if A's Custom List contains B's byline wine, A is allowed to delete the row. Drops the single `ListWine(listId, wineId)` row; the `Wine` row stays alive on B's byline and on any other list B shared it onto (B's MainList, friends' shared MainList, etc.). The implementation wraps the `delete` in a `.catch(() => null)` so a P2025 (e.g. removing a wine that was never on the list, or one already removed concurrently) returns 200 not 404 — by-design silent at the database layer. UI consumers: `/lister/[id]/page.tsx`'s "Fjern fra liste" affordance AND `add-to-list-dialog.tsx`'s `toggle()` un-check branch (when the wine is currently a member of the list and the user un-toggles — the dialog's POST-vs-DELETE routing lives in `add-to-list-dialog.tsx:toggle()`). | `/api/viner/[id]/lists/[id]` DELETE  | Removes the wine from one Custom List the caller owns. (Not a Wine delete — just ListWine.) |
| `/api/lists` GET                     | Returns the Custom Lists owned by caller (`isMain=false`). MainList is hidden from this list (it is conceptually always-the-mainlist; not a user-managed list). |
| `/api/lists` POST                    | Creates a Custom List, optionally pinning a wine (`{ name, addWineId }`). |
| `/api/lists/[id]` GET                | Reads a Custom List (owner-only) OR a MainList (any user whose `User.mainListId` points at it). |
| `/api/lists/[id]` PUT                | Rename a Custom List (owner-only). MainLists are not renamable. |
| `/api/lists/[id]` DELETE             | Delete a Custom List. (Not a Wine delete — just removes the `ListWinelistId = this` rows.) MainLists are not deletable via this endpoint; use the share-merge DELETE inverse to "delete" a MainList. |

---

## 7. UI contract & data-testids

### 7.1 `share-mainlist-dialog.tsx`

Two-button "pick winner" UX. Always posts `migrateLoserWines: true`.
This is the default both for safety (no silent destruction) and for
UX simplicity (the destructive path is reserved for an advance option
we haven't shipped).

| Selector                          | Used by                |
| -------------------------------- | ---------------------- |
| `data-testid="share-mine"`       | "Din liste blir den felles" button → POST `{ winner: "mine" }`. |
| `data-testid="share-theirs"`     | "{friendName}s liste blir den felles" button → POST `{ winner: "theirs" }`. |
| `data-testid="share-loading"`    | Spinner container present while `sharing !== null`. |
| `data-testid="share-error"`      | Inline error banner with the API's `error` message. |
| (no testid) close button         | Calls `onClose()` → parent resets `shareTarget = null` and `showShareDialog = false`. |

### 7.2 Friend list state surface

`/api/friends` `GET` response shape (kept stable for v0.14.x client
back-compat):

```ts
{
  friends: [{
    id, userId, name, email, image, status: "accepted",
    canEdit: boolean,         // true if shares MainList
    sharedMainList: boolean,  // v0.15.0 source of truth
    sharedList: boolean,      // legacy alias of sharedMainList
  }],
  pendingSent, pendingReceived,
  sharedLists: []             // v0.15.0: always empty (no separate shared-list table)
}
```

The `/app/venner/page.tsx` page reads `friend.sharedList` to choose
between the "Del liste" affordance and the "✓ Deler vinliste" badge.

---

## 8. E2E coverage — `e2e/mainlist-merge.spec.ts`

The v0.15.0 list-merge flow has its own Playwright spec dedicated to
the data-testids above. Four scenarios, all data-testid-driven, all
drained through the same ephemeral-pair fixture:

| # | Scenario                                  | Anchors                                              |
| - | ----------------------------------------- | ---------------------------------------------------- |
| 1 | share-mine via UI                         | share-mine is hidden post-click; ✓-badge appears; `friend.sharedMainList=true` |
| 2 | share-theirs via UI                       | share-theirs is hidden post-click; ✓-badge appears; `friend.sharedMainList=true` |
| 3 | split via API DELETE                      | After DELETE, `friend.sharedMainList=false`; caller's byline wine still on fresh list with `inCellar + quantity` intact. |
| 4 | error rendering (mocked 409)              | `data-testid="share-error"` surfaces the API message; dialog stays open. |

Cleanup contract: each test body is wrapped in
`try { … } finally { await cleanupMergePair(...) }`. The cleanup
deletes wines the test created, drops the friendship row, then calls
DELETE `/api/friends/share` (idempotent — splits if there are
sharers, no-ops otherwise). User rows themselves are not deleted;
`e2e-merge-${stamp}@viny.test` ghost rows accumulate per project
convention.

---

## 9. Migration notes (v0.14.x → v0.15.0)

The migration is `prisma/migrations/20260704010000_list_redesign/`.
It is fully idempotent on re-deploy (guards at every ALTER + a top-
of-migration DO block that early-returns when legacy columns are
already gone). The migration runs steps 1→9 in order:

1. **Add new columns.** `User.mainListId` + `List.isMain` + `ListWine.inCellar/quantity` + index.
2. **Flip `List.user` FK** from `Cascade` to `SetNull`.
3. **Per-user backfill DO block.** For each `User WHERE mainListId IS NULL`: create their MainList, rebind the (now-retired) Vinskapet members, migrate wines from `defaultSharedListId` rows.
4. **Unique index `User_mainListId_key` + FK `User_mainListId_fkey`.**
5. **Safety pass.** Any `Wine` whose owner lacks a `ListWine` row gets one (with `inCellar` + `quantity` read off the soon-to-be-dropped columns). This MUST run before step 6.
6. **Drop `Wine.sharedListId_fkey` + DROP `Wine.inCellar/quantity/sharedListId`.**
7. **DROP `User.defaultSharedListId` FK + key.**
8. **DROP TABLE `SharedListMember`, `SharedList`.**
9. **Drop `User.defaultSharedListId`.**

A second guard DO block short-circuits steps 1–6 when re-deploying on
an already-migrated DB (the inner SELECTs would otherwise crash with
42P01 against the dropped `SharedList`/`SharedListMember`/`defaultSharedListId`).

Zero-loss verification: `scripts/v015-baseline-probe.ts` runs an
`INVARIANT_OK` check post-migration that walks every Wine and asserts
it has ≥1 `ListWine` row, every User has a `mainListId`, and a
spot-check on a per-wine ownership invariant ((wineId) → one MainList
owner) is non-empty. The probe is idempotent and runs before any E2E
test as part of the deploy gate.

---

## 10. Verification matrix

| Surface                                       | Tool                                                |
| -------------------------------------------- | --------------------------------------------------- |
| Type-check across the entire codebase         | `npx tsc --noEmit`                                  |
| Lint                                           | `npm run lint`                                      |
| Migration zero-loss                            | `npx tsx scripts/v015-baseline-probe.ts`            |
| Friend-view permission contract (v0.14.x)      | `npx playwright test e2e/vinskapet.spec.ts`         |
| List detail (Custom Lists)                    | `npx playwright test e2e/lists.spec.ts`             |
| List-merge (v0.15.0) — share-mine, share-theirs, split, error | `npx playwright test e2e/mainlist-merge.spec.ts`     |
| Sidebar & layout regressions                  | `npx playwright test e2e/layout.spec.ts`            |

Run all five (`npx playwright test`) before pushing v0.15.0.
