-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "sharedListId" INTEGER;

-- CreateTable
CREATE TABLE "SharedList" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedListMember" (
    "id" SERIAL NOT NULL,
    "sharedListId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedListMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedListMember_sharedListId_userId_key" ON "SharedListMember"("sharedListId", "userId");

-- AddForeignKey
ALTER TABLE "SharedListMember" ADD CONSTRAINT "SharedListMember_sharedListId_fkey" FOREIGN KEY ("sharedListId") REFERENCES "SharedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedListMember" ADD CONSTRAINT "SharedListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wine" ADD CONSTRAINT "Wine_sharedListId_fkey" FOREIGN KEY ("sharedListId") REFERENCES "SharedList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
