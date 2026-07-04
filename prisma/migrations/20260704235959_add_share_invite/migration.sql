-- v0.15.1: list-share is invite-then-accept. The ShareInvite row is a
-- pending record of an inviter's request to merge MainLists with a
-- friend. The merge tx runs only POST /api/friends/share-invite/[id]/accept;
-- the caller cannot trigger the merge directly anymore. See
-- /app/api/friends/share-invite/route.ts for the matching application
-- contract. Terminal rows (accepted | declined | cancelled) hang around
-- for audit; only "pending" rows participate in the /api/friends
-- pendingShareInvites{Received,Sent} arrays.

-- CreateTable
CREATE TABLE "ShareInvite" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "winner" TEXT NOT NULL,
    "migrateLoserWines" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareInvite_fromUserId_status_idx" ON "ShareInvite"("fromUserId", "status");

-- CreateIndex
CREATE INDEX "ShareInvite_toUserId_status_idx" ON "ShareInvite"("toUserId", "status");

-- AddForeignKey
ALTER TABLE "ShareInvite" ADD CONSTRAINT "ShareInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareInvite" ADD CONSTRAINT "ShareInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
