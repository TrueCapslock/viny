-- AlterTable
ALTER TABLE "User" ADD COLUMN "openRouterKey" TEXT;
ALTER TABLE "User" ADD COLUMN "visionModel" TEXT DEFAULT 'google/gemini-2.0-flash-exp:free';
