-- v0.14.0: Per-user Default Shared List ("Vinskapet")
--
-- 1. Add User.defaultSharedListId (nullable, will become @unique later).
-- 2. For each existing User without one, create a default SharedList named
--    "Vinskapet" and add the user as its admin member; record the id.
-- 3. Move every existing cellar wine (Wine.inCellar=true, sharedListId IS NULL)
--    to its owner's Vinskapet so the cellar survives the model change.
-- 4. For each legacy ListShare(ownerId, editorId), add editor as a member of
--    owner's Vinskapet — equivalent "can add wines" semantics under the
--    new model.
-- 5. Add the unique constraint and the FK constraint last, after all rows
--    are populated correctly.

-- Step 1
-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultSharedListId" INTEGER;

-- Step 2-4: backfill
DO $$
DECLARE
  user_record RECORD;
  vinskap_id INTEGER;
  editor_id INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM "User" WHERE "defaultSharedListId" IS NULL LOOP
    INSERT INTO "SharedList" (name, "createdAt", "updatedAt")
    VALUES ('Vinskapet', NOW(), NOW())
    RETURNING id INTO vinskap_id;

    INSERT INTO "SharedListMember" ("sharedListId", "userId", role, "createdAt")
    VALUES (vinskap_id, user_record.id, 'admin', NOW());

    UPDATE "User" SET "defaultSharedListId" = vinskap_id WHERE id = user_record.id;

    -- Existing cellar wines (inCellar=true, sharedListId IS NULL) move into the
    -- new Vinskapet. Wine rows that already had a sharedListId (older explicit
    -- shared-list sharing) stay put.
    UPDATE "Wine"
    SET "sharedListId" = vinskap_id
    WHERE "userId" = user_record.id
      AND "inCellar" = true
      AND "sharedListId" IS NULL;

    -- Legacy ListShare rows become SharedListMember memberships on the owner's
    -- Vinskapet. The @@unique([sharedListId, userId]) on SharedListMember
    -- dedups; re-running the migration is safe.
    FOR editor_id IN
      SELECT "editorId" FROM "ListShare" WHERE "ownerId" = user_record.id
    LOOP
      INSERT INTO "SharedListMember" ("sharedListId", "userId", role, "createdAt")
      VALUES (vinskap_id, editor_id, 'member', NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Step 5: unique index + FK
-- AddUniqueIndex: matches Prisma's `@unique` emission (CREATE UNIQUE INDEX,
-- not ADD CONSTRAINT) so the migration diff tracks cleanly on the next
-- schema change.
CREATE UNIQUE INDEX "User_defaultSharedListId_key" ON "User"("defaultSharedListId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultSharedListId_fkey"
  FOREIGN KEY ("defaultSharedListId") REFERENCES "SharedList"(id) ON DELETE SET NULL;
