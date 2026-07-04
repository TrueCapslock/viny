-- ============================================================================
-- v0.15.0 — list redesign
--
-- Replaces the per-user Vinskapet-as-SharedList model with a per-user
-- MainList (a List row with isMain=true). Cellar state moves from the
-- Wine row to the ListWine join (inCellar + quantity). SharedList and
-- SharedListMember are retired.
--
-- Every statement is idempotent (IF EXISTS / IF NOT EXISTS) so a re-run
-- on a partially-applied state completes without error. The PL/pgSQL
-- variables are deliberately NOT abbreviated (`sl_member` instead of
-- `sm`) to avoid Postgres error 42702 'column reference is ambiguous'
-- when a variable name collides with a table alias.
--
-- IMPORTANT ORDERING CONSTRAINT: step 5 (safety pass) MUST run before
-- step 6 (DROP Wine columns) because step 5 reads Wine.inCellar /
-- Wine.quantity off the Wine row to preserve cellar count on partial-
-- state re-deploys.
--
-- Read PLAN_LIST_REDESIGN.md before altering this file. Data-loss
-- invariants this migration must satisfy:
--   1. Every (user, owned wine) maps to exactly one ListWine row on the
--      user's MainList.
--   2. Cellar flag and quantity on every Wine survive.
-- ============================================================================

-- 1. Add new columns (idempotent; safe defaults).

ALTER TABLE "User"     ADD COLUMN IF NOT EXISTS "mainListId" INTEGER;
ALTER TABLE "List"     ADD COLUMN IF NOT EXISTS "isMain"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListWine" ADD COLUMN IF NOT EXISTS "inCellar"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListWine" ADD COLUMN IF NOT EXISTS "quantity"   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "List_userId_isMain_idx" ON "List"("userId", "isMain");

-- 2. Switch List.userId FK from ON DELETE CASCADE to ON DELETE SET NULL.
--    After this migration, two users can share a MainList; the FK must
--    not nuke the shared list if only one of the users is deleted.

ALTER TABLE "List" DROP CONSTRAINT IF EXISTS "List_userId_fkey";
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;

-- 3. Per-user backfill: create MainList, migrate wines, rebind Vinskapet
--    sharers, sweep legacy non-Vinskapet SharedLists onto the creator's
--    MainList. Wrapped in an IF EXISTS / RETURN guard: this step only
--    makes sense BEFORE the legacy `User.defaultSharedListId` column
--    and the `SharedList`/`SharedListMember` tables are dropped. On any
--    re-deploy against an already-migrated DB, the guard short-circuits
--    the entire DO block — without it, the cursor `SELECT s.* FROM
--    "SharedList" s` would crash with `42P01 relation does not exist`.
--
--    The DO block is also safe to re-run mid-deploy because the WHERE
--    clause filters on `mainListId IS NULL` and inserts hit
--    `ON CONFLICT ("listId", "wineId") DO NOTHING`.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_name = 'User' AND column_name = 'defaultSharedListId'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_name = 'SharedListMember'
  ) THEN
    -- Re-deploy on already-migrated DB. Skip the legacy-tied backfill.
    RETURN;
  END IF;
END $$;

DO $$
DECLARE
  u                RECORD;
  main_list        INTEGER;
  vinskap          INTEGER;
  sl_member        RECORD;  -- Renamed from 'sm' to avoid PL/pgSQL
                            -- identifier collision.
  legacy_sl        RECORD;
  creator_id       INTEGER;
  creator_main_id  INTEGER;
BEGIN
  -- 3a. Per User without a MainList: create one, rebind Vinskapet
  --     members, migrate Vinskapet wines, catch leftover cellar wines,
  --     then land a ListWine row for every owned wine.
  FOR u IN
    SELECT id, "defaultSharedListId" FROM "User" WHERE "mainListId" IS NULL
  LOOP
    INSERT INTO "List" ("userId", "isMain", "name", "createdAt", "updatedAt")
    VALUES (u.id, true, 'UseMainList', NOW(), NOW())
    RETURNING id INTO main_list;

    UPDATE "User" SET "mainListId" = main_list WHERE id = u.id;

    vinskap := u."defaultSharedListId";
    IF vinskap IS NOT NULL THEN
      FOR sl_member IN
        SELECT "userId" FROM "SharedListMember"
        WHERE "sharedListId" = vinskap
      LOOP
        UPDATE "User" SET "mainListId" = main_list
        WHERE id = sl_member."userId";
      END LOOP;
    END IF;

    IF vinskap IS NOT NULL THEN
      INSERT INTO "ListWine" ("listId", "wineId", "inCellar", "quantity", "addedAt")
      SELECT main_list, w.id, w."inCellar", w."quantity", NOW()
      FROM   "Wine" w
      WHERE  w."userId" = u.id AND w."sharedListId" = vinskap
      ON CONFLICT ("listId", "wineId") DO NOTHING;
    END IF;

    INSERT INTO "ListWine" ("listId", "wineId", "inCellar", "quantity", "addedAt")
    SELECT main_list, w.id, w."inCellar", w."quantity", NOW()
    FROM   "Wine" w
    WHERE  w."userId" = u.id AND w."inCellar" = true
    ON CONFLICT ("listId", "wineId") DO NOTHING;

    INSERT INTO "ListWine" ("listId", "wineId", "inCellar", "quantity", "addedAt")
    SELECT main_list, w.id, false, 0, NOW()
    FROM   "Wine" w
    WHERE  w."userId" = u.id
    ON CONFLICT ("listId", "wineId") DO NOTHING;
  END LOOP;

  -- 3b. Legacy non-Vinskapet SharedLists (ad-hoc sharing via the legacy
  --     /api/shared-lists route) — migrate their wines onto the admin-
  --     member's MainList per PLAN_LIST_REDESIGN §10.3. Second member
  --     loses access; that's the explicit trade-off.
  FOR legacy_sl IN
    SELECT s.* FROM "SharedList" s
    WHERE s.id NOT IN (
      SELECT "defaultSharedListId" FROM "User"
      WHERE "defaultSharedListId" IS NOT NULL
    )
  LOOP
    SELECT sl_inner."userId" INTO creator_id
    FROM   "SharedListMember" sl_inner
    WHERE  sl_inner."sharedListId" = legacy_sl.id
    ORDER BY CASE WHEN sl_inner.role = 'admin' THEN 0 ELSE 1 END,
             sl_inner."createdAt" ASC
    LIMIT 1;

    IF creator_id IS NULL THEN CONTINUE; END IF;

    SELECT "mainListId" INTO creator_main_id FROM "User"
    WHERE id = creator_id;
    IF creator_main_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO "ListWine" ("listId", "wineId", "inCellar", "quantity", "addedAt")
    SELECT creator_main_id, w.id, w."inCellar", w."quantity", NOW()
    FROM   "Wine" w
    WHERE  w."sharedListId" = legacy_sl.id
    ON CONFLICT ("listId", "wineId") DO NOTHING;
  END LOOP;
END $$;

-- 4. Add the unique index + FK on User.mainListId, matching the prior
--    migration's CREATE UNIQUE INDEX style so future migrate diff stays
--    drift-clean.

CREATE UNIQUE INDEX IF NOT EXISTS "User_mainListId_key" ON "User"("mainListId");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_mainListId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_mainListId_fkey"
  FOREIGN KEY ("mainListId") REFERENCES "List"(id) ON DELETE SET NULL;

-- 5. Safety pass (runs BEFORE step 6 drops the Wine columns so it can
--    still read them). Catches any Wine whose owner has a MainList but
--    still has no ListWine row (defends against partial-state re-runs).
--    Reads Wine.inCellar / Wine.quantity directly off the Wine row to
--    preserve cellar count.

DO $$
DECLARE
  orphan     RECORD;
  user_main  INTEGER;
BEGIN
  FOR orphan IN
    SELECT w.id AS wine_id, w."userId" AS owner_id,
           w."inCellar" AS in_cellar, w."quantity" AS qty
    FROM   "Wine" w
    WHERE  NOT EXISTS (
      SELECT 1 FROM "ListWine" lw WHERE lw."wineId" = w.id
    )
  LOOP
    SELECT "mainListId" INTO user_main FROM "User" WHERE id = orphan.owner_id;
    IF user_main IS NULL THEN
      INSERT INTO "List" ("userId", "isMain", "name", "createdAt", "updatedAt")
      VALUES (orphan.owner_id, true, 'UseMainList', NOW(), NOW())
      RETURNING id INTO user_main;
      UPDATE "User" SET "mainListId" = user_main WHERE id = orphan.owner_id;
    END IF;

    INSERT INTO "ListWine" ("listId", "wineId", "inCellar", "quantity", "addedAt")
    VALUES (user_main, orphan.wine_id,
            COALESCE(orphan.in_cellar, false),
            COALESCE(orphan.qty, 0),
            NOW())
    ON CONFLICT ("listId", "wineId") DO NOTHING;
  END LOOP;
END $$;

-- 6. Drop obsolete Wine columns. The FK (Wine_sharedListId_fkey) is
--    dropped first so it doesn't block the column drop.

ALTER TABLE "Wine" DROP CONSTRAINT IF EXISTS "Wine_sharedListId_fkey";
ALTER TABLE "Wine" DROP COLUMN IF EXISTS "inCellar";
ALTER TABLE "Wine" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "Wine" DROP COLUMN IF EXISTS "sharedListId";

-- 7. Drop the legacy User.defaultSharedListId FK + unique constraint
--    (the constraint drop also drops its backing unique index, so an
--    explicit DROP INDEX would error; postgres handles it).

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_defaultSharedListId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_defaultSharedListId_key";

-- 8. Drop the legacy shared-list tables (depopulated by step 3).

DROP TABLE IF EXISTS "SharedListMember";
DROP TABLE IF EXISTS "SharedList";

-- 9. Drop the legacy User.defaultSharedListId column last.

ALTER TABLE "User" DROP COLUMN IF EXISTS "defaultSharedListId";
