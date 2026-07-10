-- Drop the residual UNIQUE on "User"."mainListId" so two friends can
-- legitimately share a MainList (with both User.mainListId pointing
-- at the same List row) after /api/friends/share POST. The list-redesign
-- migration (20260704010000) replaced the multi-user SharedList model
-- but left the @unique attribute on, which manifestly conflicts with
-- the v0.15.0 share-merge contract proven by the e2e suite.
ALTER TABLE "User" DROP CONSTRAINT "User_mainListId_key";

-- Add a non-unique index for query performance (the @unique -> index
-- swap is a wash on HOT reads but unblocks the merged-MainList writes
-- the share-merge route does at /api/friends/share tx.user.update).
CREATE INDEX "User_mainListId_idx" ON "User"("mainListId");
