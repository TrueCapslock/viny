-- 20260116000000_tasting_user
--
-- v0.20.0: per-author ownership for Tastings. Each tasting gains a
-- `userId` column pointing at the User who created it, so the API
-- can gate PUT / DELETE on author identity. Schema companion: see
-- `prisma/schema.prisma` (`Tasting.userId User @relation(... onDelete:
-- Cascade)` and `@@index([userId])`).
--
-- Order: ADD nullable -> backfill from Wine byline -> ALTER NOT
-- NULL -> FK CASCADE -> index. Each step's preconditions are
-- satisfied by the prior step; the orphan-count DO $$ guard stops
-- the migration loud if any row survives the backfill unresolved.

-- 1. Add the column nullable; existing rows have no author yet.
ALTER TABLE "Tasting" ADD COLUMN "userId" INTEGER;

-- 2. Backfill: every pre-existing Tasting inherits the byline
--    owner of its Wine. Wine.userId is NOT NULL in the schema,
--    so the subquery always resolves and no orphan rows are
--    produced.
UPDATE "Tasting" t
SET "userId" = w."userId"
FROM "Wine" w
WHERE t."wineId" = w."id";

-- Sanity guard: stop the migration loud if any row is still null,
-- which would otherwise block the upcoming ALTER COLUMN ... SET
-- NOT NULL. Catches a script bug rather than a FK violation.
DO $$
DECLARE orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "Tasting" WHERE "userId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'tasting_user backfill left % orphan rows', orphan_count;
  END IF;
END $$;

-- 3. Flip the column to NOT NULL now that every row resolves.
ALTER TABLE "Tasting" ALTER COLUMN "userId" SET NOT NULL;

-- 4. FK with ON DELETE CASCADE so account deletion also drops the
--    author's tastings (matches Wine.userId cascade for privacy).
ALTER TABLE "Tasting"
  ADD CONSTRAINT "Tasting_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Index the new column for fast author-scoped reads (the
--    future "my tastings" feed, the /viner/[id] row-level
--    extraction done today, audit listing).
CREATE INDEX "Tasting_userId_idx" ON "Tasting"("userId");
