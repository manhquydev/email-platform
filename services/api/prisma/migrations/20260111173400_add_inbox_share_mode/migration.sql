-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Inbox" ADD COLUMN "shareMode" "ShareMode" NOT NULL DEFAULT 'PRIVATE';
