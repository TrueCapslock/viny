-- DropForeignKey
ALTER TABLE "ListShare" DROP CONSTRAINT "ListShare_editorId_fkey";

-- DropForeignKey
ALTER TABLE "ListShare" DROP CONSTRAINT "ListShare_ownerId_fkey";

-- DropTable
DROP TABLE "ListShare";
