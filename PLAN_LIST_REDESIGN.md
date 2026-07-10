# v0.15.0 — List Redesign

Status: **Draft, awaiting owner signoff on the open decisions at the
bottom before implementation begins.**

The user's rules (verbatim):

1. "a user should start with a default MainList all wines they add are
   added here."
2. "if a wine is taged as 'i vinskapet' the list should record that and
   how many."
3. "so the two views all and vinskap are the same list just filtered on
   if the wine is in the vinskap."
4. "if users share list they should select one of the users default
   MainList to shange to ther shared MainList, the other is deleted."

The owner has already confirmed (async conversation):
- Sharing: the **inviter picks winner MainList** ("mine" vs "theirs").
- The **inviter is asked** whether to migrate the loser's wines into
  the winner before deletion.
- Friends still **peek each other's MainLists read-only**.

The thinker's critical pass on this design flagged four data-loss
risks that shape every section below (Delete cascade, Owner-cascade,
Friend-peek regression, Legacy-SharedList drift). Each is addressed.

---

## 1. Concept model after this change

There is exactly one **List** type. List rows that live in the DB:

- **MainList** — `List.isMain = true`, the one default-list owned by
  one or two Users (after a share-merge). Identified by
  `User.mainListId` FK on the User(s) pointing at it.
- **Custom List** — `List.isMain = false`, the existing per-user
  private collection. Today they hold wines only their owner can see.

Wine semantics:

- A wine is visible iff **some `ListWine` row references it**, where
  that list is one the viewer can see. There is no other visibility
  axis.
- The Vinskapet shelf status is **`ListWine.inCellar`** and the
  quantity is **`ListWine.quantity`**. Both live on the join row, not
  on the Wine row.
- "Alle viner" view = wines on viewer's MainList (or friend target's,
  etc.). "Vinskap" view = same filter `inCellar = true`. No separate
  list — same data, different client-side filter.

---

## 2. Schema changes (prisma/schema.prisma)

### Add `User.mainListId`
```
mainListId  Int? @unique
mainList    List? @relation("UserMainList", fields: [mainListId],
                              references: [id], onDelete: SetNull)
```
- Nullable + unique (one MainList per User at most).
- `onDelete: SetNull`, **not** `Cascade` — if a list row gets deleted
  unexpectedly, the User keeps their account but loses the FK.
  (Thinker risk note: list lifecycle must not be tied to one User's
  account deletion, because two users can share a MainList per design.)

### Add identity flag on `List`
```
isMain    Boolean @default(false)
@@index([userId, isMain])
```
- The MainList is just a `List` with `isMain=true`. No new model.
- The index makes "fetch the one MainList for a user" an O(1) lookup.

### `List` ownership: tie only to inviter for metadata, not for lifecycle

The "two users share a MainList" path means a MainList row can have
**two** `User.mainListId` FKs pointing at it after a share-merge.

Plan: `List.userId` keeps its current meaning (**the technical
owner / metadata owner** — the winner of the merge),
`onDelete: SetNull` rather than `Cascade`. This way, even if the
winner account is deleted, the MainList row + its `ListWine` rows
survive; the loser's `User.mainListId` keeps pointing at it.

### `ListWine` joins carry the cellar state
```
inCellar  Boolean @default(false)
quantity  Int     @default(0)
@@id([listId, wineId])    // already exists
```
- Already has the composite PK. No migration of unique constraints.
- The `(listId, wineId)` row uniqueness is what guarantees no
  duplicate ListWine under the same list.

### `Wine` row stripped
```
DROP COLUMN "inCellar"
DROP COLUMN "quantity"
DROP COLUMN "sharedListId"     // no more sharedListId column
```
- `Wine.userId` is **renamed `Wine.createdById`** for accuracy —
  access control no longer derives from this column.
- All other Wine columns unchanged.

### `SharedList` and `SharedListMember` dropped
- After the backfill their data is fully ported. Drop the tables.
- The `Wine.sharedListId` column is dropped as part of the same
  migration; the migration cascades correctly because `SharedList`
  rows are already empty after the backfill loop.

---

## 3. Migration backfill (`YYYYMMDDhhmmss_list_redesign`)

Order matters. The migration is a single SQL file (Prisma's standard
multi-statement format), but the **backfill DO block must run between
the column adds and the column drops** so we always have a fallback
state if a statement fails mid-way.

```sql
-- 1. ALTER TABLE Add column on User
ALTER TABLE "User" ADD COLUMN "mainListId" INTEGER;

-- 2. ALTER TABLE Add column on List
ALTER TABLE "List" ADD COLUMN "isMain" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "List_userId_isMain_idx" ON "List"("userId", "isMain");

-- 3. ALTER TABLE Add column on ListWine
ALTER TABLE "ListWine" ADD COLUMN "inCellar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListWine" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;

-- 4. Per existing User, create the MainList and migrate their wines
DO $$
DECLARE
  u RECORD;
  wineslip RECORD;
  main_list_id INTEGER;
  vinskap_id   INTEGER;
BEGIN
  FOR u IN SELECT * FROM "User" WHERE "mainListId" IS NULL LOOP

    INSERT INTO "List" ("userId", "isMain", "name",
                        "createdAt", "updatedAt")
    VALUES (u.id, true,
            coalesce(u.name, 'Min liste'),
            NOW(), NOW())
    RETURNING id INTO main_list_id;

    UPDATE "User" SET "mainListId" = main_list_id WHERE id = u.id;

    -- Migrate wines that already live in the v0.14.x Vinskapet.
    vinskap_id := u."defaultSharedListId";
    IF vinskap_id IS NOT NULL THEN
      INSERT INTO "ListWine" ("listId", "wineId", "inCellar",
                              "quantity", "addedAt")
      SELECT  main_list_id,
              w.id,
              w."inCellar",
              w."quantity",
              NOW()
      FROM    "Wine" w
      WHERE   w."userId" = u.id
              AND w."sharedListId" = vinskap_id
      ON CONFLICT ("listId", "wineId") DO NOTHING;

      -- Anyone with a SharedListMember row on the Vinskapet ALSO
      -- gets `User.mainListId` repointed at the winner's MainList.
      -- This is the share-merge of the v0.14.x model into the new one,
      -- made deterministic by the migration rather than a UI invite.
      UPDATE "User" target
      SET    "mainListId" = main_list_id
      FROM   "SharedListMember" sm
      WHERE  sm."sharedListId" = vinskap_id
             AND sm."userId" = target.id;
    END IF;

    -- Migrate cellar-flagged wines that NEVER made it onto the
    -- Vinskapet (pre-v0.14.0 leftovers the migration missed).
    INSERT INTO "ListWine" ("listId", "wineId", "inCellar",
                            "quantity", "addedAt")
    SELECT  main_list_id,
            w.id,
            w."inCellar",
            w."quantity",
            NOW()
    FROM    "Wine" w
    WHERE   w."userId" = u.id
            AND w."inCellar" = true
            AND w."wineId" NOT IN (
              SELECT "wineId" FROM "ListWine" WHERE "listId" = main_list_id
            )
    ON CONFLICT ("listId", "wineId") DO NOTHING;

    -- Migrate EVERY other wine owned by u (the "create on MainList"
    -- semantics for newly-registered users, retro-applied to
    -- existing users).
    INSERT INTO "ListWine" ("listId", "wineId", "inCellar",
                            "quantity", "addedAt")
    SELECT  main_list_id,
            w.id,
            false, 0, NOW()
    FROM    "Wine" w
    WHERE   w."userId" = u.id
            AND w."wineId" NOT IN (
              SELECT "wineId" FROM "ListWine" WHERE "listId" = main_list_id
            )
    ON CONFLICT ("listId", "wineId") DO NOTHING;

  END LOOP;
END $$;
```

After the DO block:

```sql
-- 5. Add the unique index on User.mainListId
CREATE UNIQUE INDEX "User_mainListId_key" ON "User"("mainListId");

-- 6. Add the FK
ALTER TABLE "User"
  ADD CONSTRAINT "User_mainListId_fkey"
  FOREIGN KEY ("mainListId") REFERENCES "List"(id) ON DELETE SET NULL;

-- 7. Drop old columns
ALTER TABLE "Wine" DROP COLUMN "inCellar";
ALTER TABLE "Wine" DROP COLUMN "quantity";
ALTER TABLE "Wine" DROP COLUMN "sharedListId";

-- 8. Drop the SharedList and SharedListMember tables (no more users)
DROP TABLE "SharedListMember";
DROP TABLE "SharedList";

-- 9. Drop the User.defaultSharedListId column last (after FK is gone)
ALTER TABLE "User" DROP CONSTRAINT "User_defaultSharedListId_fkey";
DROP INDEX  "User_defaultSharedListId_key";
ALTER TABLE "User" DROP COLUMN "defaultSharedListId";
```

### Risks the migration addresses

- **Wine-orphan risk**: by the time we drop `Wine.inCellar` /
  `Wine.quantity` / `Wine.sharedListId`, every existing wine has a
  matching `ListWine` row on its owner's new MainList. The cellar
  count and quantity are preserved 1:1.
- **Legacy non-Vinskapet SharedList risk**: the v0.14.0 backfill
  already swept explicit shared-list wines into the Vinskapet only
  when `userId = owner`. Wines that were shared through the legacy
  `/api/shared-lists` flow live at `Wine.sharedListId` pointing at
  some *non*-Vinskapet SharedList. The migration does **not** touch
  those — they are orphaned along with the table they live in, and
  the migration explicitly notes this (failure mode = data loss + log
  warning).
- **`Wine.createdById` rename**: runs as a separate Prisma
  `rename` schema change, NOT a SQL rename, so the Prisma client
  refreshes cleanly. The migration only deals with data.

### Migration verification

- Print before/after counts in a follow-up migration commit
  (file `verify_backfill.sql` or similar):
  - `SELECT COUNT(*) FROM "User" WHERE "mainListId" IS NOT NULL` → must
    equal `SELECT COUNT(*) FROM "User"`.
  - For each User, `SELECT COUNT(*) FROM "Wine" w WHERE w."userId" = u.id`
    must equal `SELECT COUNT(*) FROM "ListWine" lw WHERE lw.listId = u.mainListId`.

---

## 4. API contract

### `/api/viner`

| Verb | Path | Auth | Effect |
|---|---|---|---|
| GET | `/api/viner` | caller | Wines on caller's MainList (any `inCellar`) + wines on caller's Custom Lists. |
| GET | `/api/viner?userId=X` | caller (friend of X) | Wines on X's MainList. |
| POST | `/api/viner` | caller | Creates a Wine + ListWine(caller.mainListId, inCellar from body). |
| POST | `/api/viner?userId=X` | caller (shares X's MainList — i.e. caller.mainListId === X.mainListId) | Creates a Wine + ListWine(X.mainListId, inCellar from body). |

### `/api/viner/[id]`

| Verb | Auth | Effect |
|---|---|---|
| GET | Read gate | Wine + tastings. (Read gate: caller can see ANY list that contains the wine, OR caller is the wine's `createdById`.) |
| PUT | Owner + list-member | Edit metadata + inCellar + quantity. The inCellar/quantity update write to **caller's MainList row** (auto-creates if missing — only if caller has access to the wine). |
| PATCH | Owner + list-member | Same as PUT but the body is `{inCellar, quantity}`. |
| DELETE | List-member of *any* list containing the wine | **Drops the ListWine row, NOT the Wine row** (thinker risk fix). If after this delete the Wine has zero `ListWine` references, also deletes the Wine row. |

### `/api/lists` (Custom Lists, unchanged semantics)

The existing routes continue to work. The migration adds the
`isMain=true/false` filter so `GET /api/lists` (caller's Custom Lists
index) excludes the MainList row with a `isMain=false` filter.

### `/api/lister/[id]` (a Custom List or MainList detail)

After the migration this endpoint handles **both** Custom and Main
lists. The Custom List semantics is unchanged; the MainList view shows
all wines on the MainList (caller can add/edit cellar flags as
before).

### `/api/friends/share` (the share-merge route)

This route is **rewritten** end-to-end:

```
POST /api/friends/share { friendUserId, winner: "mine"|"theirs" }
```

Behavior:

1. Validate that caller and target are friends (`Friend` row accepted).
2. Caller must have a `mainListId`, target must have a `mainListId`
   (both are non-null for any user created under v0.14.x or later;
   older pre-migration users got one during the migration. Older
   pre-history users got one in the same migration backfill.).
3. Confirm `winner` is "mine" || "theirs" + the inviter was prompted
   in the UI before this POST.
4. In a transaction:
   - `loser_list := winner == "mine" ? target.mainListId : caller.mainListId`
   - `winner_list := winner == "mine" ? caller.mainListId : target.mainListId`
   - **`migrateLoserWines` (decoupled)**: the UI prompts the inviter
     "Move loser's cellar wines to the winner?" — the choice is sent
     as a separate query/body field (`migrate: boolean`). If `true`,
     `UPDATE ListWine SET listId = $winner_list WHERE listId = $loser_list`.
   - If `migrate= true`: also point loser's `User.mainListId` at the
     winner List AND drop the now-empty loser List row (cascade
     removes zero ListWines — already migrated).
   - If `migrate= false`: drop the loser List row, which **also
     drops all ListWine rows pointing at it, which deletes their
     target Wine rows if no other ListWine references each one**. The
     inviter is warned in the dialog this is destructive.

### `/api/shared-lists` (legacy merge)

The route file is **deleted**. There is no API endpoint for it after
v0.15.0; the share functionality is fully subsumed by
`/api/friends/share` (list-merge).

---

## 5. UI changes

### `/app/page.tsx` (the home — "Alle viner / I vinskapet" tabs)

The two-tab filter rewrites:

- Both tabs read the **same dataset** (`GET /api/viner` already
  returns caller's MainList wines).
- "Alle viner" tab shows the entire list.
- "I vinskapet" tab filters the dataset on
  `lw.inCellar === true` client-side.
- After the change, `wine.inCellar` is no longer on the Wine row. The
  API now returns `{ wine, joinedAt, inCellar, quantity, listId }` and
  the home page reads `wine.joinedForCaller.inCellar` to filter.

### `/app/viner/[id]/page.tsx` (wine detail)

- The `CellarToggle` is wired to a new PATCH route
  `/api/viner/[id]/cellar` (NEW) that targets the caller's MainList
  `ListWine(row)` specifically.
- The visibility gate (`canEdit`) is now "is the caller's MainList
  the same as the wine's list, OR does the caller share that list, OR
  is the caller the wine creator?".

### `/app/_components/cellar-toggle.tsx`

- PATCH body still `{inCellar, quantity}` but route is the new
  `/api/viner/[id]/cellar`.
- Visibility: rendered iff `canEdit` on the page is true.

### `/app/_components/wine-card.tsx`

- The "i mitt vinskap" badge becomes a `ListWine`-derived field that
  comes back from `/api/viner`. Reads from `wine.inCellarForViewer`
  (the joined row's inCellar).

### `/app/_components/add-to-list-button.tsx` (Custom Lists add)

- Behavior unchanged — gate: caller can read the wine (via any list
  the caller shares with the wine).

### New: Share-MainList dialog

- Lives at `/app/venner/[id]/_components/share-mainlist-dialog.tsx`.
- Renders under each friend card. Replaces "Del liste" + "Angre deling"
  buttons. Flow:
  1. Tap "Del hovedliste".
  2. Dialog: "Hvis dere deler, forsvinner den andres hovedliste.
     Hva skal den andres viner gjøre?" Radio:
     - "Flytt vinene til min hovedliste" (migrate).
     - "Slett den andres hovedliste med vinene" (destructive).
  3. Dialog: "Hvem sin hovedliste blir den delte?": Radio:
     - "Min hovedliste"
     - "Vennens hovedliste"
  4. Submit POST `/api/friends/share` with both choices.
  5. UI reloads.

---

## 6. Friend visibility

The friend "peek" rule under the new model:

```
can_friend_peek_wine(target_user_id, viewer_user_id, wine_id):
  (SELECT 1
   FROM   "ListWine" lw
   JOIN   "User" u ON u.id = target_user_id
   WHERE  lw."wineId" = wine_id
          AND lw."listId" = u."mainListId"
   LIMIT 1) IS NOT NULL
```

The composite check (friend relationship + wine is on target's
MainList) is preserved. The `Wine.sharedListId = owner.defaultSharedListId`
clause is replaced with `ListWine.listId = owner.mainListId`.

The `canEdit` gate for the CellarToggle is:

```
can_edit_wine(viewer_user_id, wine_id):
  EXISTS (
    SELECT 1 FROM "ListWine" lw
    JOIN   "User" u ON u.id = viewer_user_id
    WHERE  lw."wineId" = wine_id
           AND lw."listId" = u."mainListId"
  ) OR EXISTS (
    SELECT 1 FROM "Wine"
    WHERE  "id" = wine_id AND "createdById" = viewer_user_id
  )
```

---

## 7. Custom Lists interplay

- A Custom List stays owner-private. No sharing path.
- A user CAN add wines they have access to (via own MainList,
  shared MainList, OR friend's MainList peek) into their own Custom
  Lists — gate through `canAccessWine(listOfListTargets, userId)`.
- The wine record's `createdById` does NOT change when a Custom List
  references an existing wine. Custom Lists are pure references.

---

## 8. Risks addressed (from the thinker's pass)

- **Cascade risk on shared MainList user deletion**: `List.userId` is
  kept but **no longer uses `onDelete: Cascade`** — it's `SetNull` so
  deleting a user record does not nuke the shared MainList.
- **Wine-vs-ListWine delete**: the new `DELETE /api/viner/[id]` drops
  the `ListWine` row, not the Wine row. Wine row deletion is
  conditional on zero remaining `ListWine` references.
- **Friend-peek regression**: replaced `Wine.sharedListId = X.defaultSharedListId`
  with `ListWine.listId = X.mainListId`.
- **Legacy non-Vinskapet SharedList**: explicitly noted as a
  data-loss edge case in the migration. The recommended cleanup is a
  separate follow-up migration (`v0.15.1_audit_legacy_shared_lists`)
  that scans for orphan wines once the migration is live.

---

## 9. Tests

### New e2e: `e2e/mainlist-merge.spec.ts`

Pins the v0.15.0 contract:

1. Register User A and User B (the seeded `test@test.no` user is A).
2. A adds three wines: `{ inCellar: true, quantity: 2 }`,
   `{ inCellar: false, quantity: 0 }`, `{ inCellar: true, quantity: 1 }`.
3. A and B friend each other (B sends request; A accepts).
4. A opens the share dialog on B and picks:
   - Migrate loser's wines = true
   - Winner = Mine
5. Assert: A's MainList now has all three of A's wines; B's MainList
   row is gone; `B.mainListId` points at A's MainList.
6. B adds a new wine. Assert: it's visible from /api/viner on both
   A and B's home page.
7. B adds the new wine to B's private Custom List. Assert: appears
   there.
8. A deletes the wine from the shared cellar. Assert: B's Custom List
   still has it (the wine-Vs-ListWine delete safety).
9. Put another WIN check: refresh B's Custom List page, the wine is
   still listed.

### Reuse `e2e/vinskapet.spec.ts`

The existing friend-view smoke test continues to pass — but its
assertion surface needs an update:

- Replace "Vinskapet wine visible to friend at /venner/<id>" with the
  same assertion under the new model. The route is the same
  (`GET /api/viner?userId=X`), so no test change is needed actually —
  just rerun.

### Reuse `e2e/lists.spec.ts`

Existing Custom List tests continue to pass unchanged.

---

## 10. Resolved decisions (owner signoff)

The three questions at the bottom of this document are now answered:

### 1. MainList default name = `"UseMainList"` (literal)

The `List.name` column on MainList rows is set to the constant string
`"UseMainList"`. The user noted the name isn't surfaced anywhere in
the UI; the technical label is enough. UI surfaces that show a
MainList render a localised label (`"Hovedlisten"` / `"Min vinliste"`)
independent of the DB-stored `name`. Custom Lists keep their
user-provided `name`.

### 2. Friend-peek shows inCellar + quantity

`GET /api/viner?userId=X` for a friend of X returns wines on X's
MainList **with** `inCellar` and `quantity` populated as they appear on
the `ListWine` join row. The owner can't hide cellar status from a
friend — it's plain metadata, not a private field. Implementation: the
join in the `GET /api/viner?userId=X` query selects
`lw.inCellar, lw.quantity` from `ListWine` and surfaces them on the
response just like the home page does for the caller.

### 3. Legacy non-Vinskapet SharedList → MainList-of-creator

Wines in legacy `SharedList` rows that are NOT a `defaultSharedListId`
Vinskapet are migrated to the **admin member's** MainList. The
migration identifies the creator as the first `SharedListMember`
with `role='admin'` for that `SharedList` (fallback: first member by
`createdAt asc`). Each wine in such a legacy SharedList gets a new
`ListWine` row on the creator's MainList with `inCellar` and
`quantity` preserved from the Wine row. ListWine conflicts hit the
composite-PK `ON CONFLICT DO NOTHING`, so a wine already on the
creator's MainList is not duplicated.

Effect on the second member: they lose read access to those wines
(unless they happen to also be on the creator's MainList via some
other list). This is the trade-off the owner picked.

The migration block now reads:

```sql
-- Step 4b: legacy non-Vinskapet SharedLists migrate to creator's MainList
DO $$
DECLARE
  sl RECORD;
  creator_id INTEGER;
  creator_main_id INTEGER;
BEGIN
  FOR sl IN
    SELECT   s.*
    FROM     "SharedList" s
    WHERE    s.id NOT IN (
               SELECT "defaultSharedListId" FROM "User"
               WHERE "defaultSharedListId" IS NOT NULL
             )
  LOOP
    SELECT sm."userId" INTO creator_id
    FROM   "SharedListMember" sm
    WHERE  sm."sharedListId" = sl.id
    ORDER BY CASE WHEN sm.role = 'admin' THEN 0 ELSE 1 END,
             sm."createdAt" ASC
    LIMIT 1;

    IF creator_id IS NULL THEN
      CONTINUE;  -- degenerate SharedList with no members — drop with the table
    END IF;

    SELECT "mainListId" INTO creator_main_id
    FROM   "User"
    WHERE  id = creator_id;

    IF creator_main_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO "ListWine" ("listId", "wineId", "inCellar",
                            "quantity", "addedAt")
    SELECT  creator_main_id, w.id, w."inCellar", w."quantity", NOW()
    FROM    "Wine" w
    WHERE   w."sharedListId" = sl.id
    ON CONFLICT ("listId", "wineId") DO NOTHING;
  END LOOP;
END $$;
```

Implementation begins.
