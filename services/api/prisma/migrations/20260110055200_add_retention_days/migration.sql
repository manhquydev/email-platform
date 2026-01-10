-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER;

-- AlterTable
ALTER TABLE "Inbox" ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER;
