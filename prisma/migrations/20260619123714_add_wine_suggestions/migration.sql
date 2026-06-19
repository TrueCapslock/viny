-- CreateTable
CREATE TABLE "WineSuggestion" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "message" TEXT,
    "wineId" INTEGER,
    "name" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "vintage" INTEGER,
    "varietal" TEXT,
    "region" TEXT,
    "country" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WineSuggestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WineSuggestion" ADD CONSTRAINT "WineSuggestion_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WineSuggestion" ADD CONSTRAINT "WineSuggestion_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WineSuggestion" ADD CONSTRAINT "WineSuggestion_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
