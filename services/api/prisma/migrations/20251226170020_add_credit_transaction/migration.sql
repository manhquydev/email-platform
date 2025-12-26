/*
  Warnings:
  - This migration has been manually pruned to handle schema drift on production.
  - It only applies Credit System changes.
*/

-- CreateEnum Safe
DO $$ BEGIN
    CREATE TYPE "CreditTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'USAGE', 'REFUND', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable CreditTransaction (if not exists handled by clean apply, but here we assume it doesnt exist as per checks)
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable User (Add credits)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 0;

-- COMMENTED OUT EXISTING SCHEMA ITEMS TO PREVENT CONFLICTS
/*
-- CreateEnum
CREATE TYPE "FilterMatchType" AS ENUM ('ALL', 'ANY');
-- CreateEnum
CREATE TYPE "FilterConditionField" AS ENUM ('FROM', 'TO', 'SUBJECT', 'BODY', 'HAS_ATTACHMENT');
-- CreateEnum
CREATE TYPE "FilterConditionOperator" AS ENUM ('CONTAINS', 'NOT_CONTAINS', 'EQUALS', 'NOT_EQUALS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX');
-- CreateEnum
CREATE TYPE "FilterActionType" AS ENUM ('MOVE_TO_FOLDER', 'ADD_LABEL', 'REMOVE_LABEL', 'MARK_READ', 'MARK_SPAM', 'DELETE', 'FORWARD');
-- DropIndex
DROP INDEX "idx_message_subject_trgm";
-- DropIndex
DROP INDEX "idx_message_textbody_trgm";
-- AlterTable
ALTER TABLE "Inbox" ALTER COLUMN "claimedAt" SET NOT NULL;
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDisabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "verifiedForwardEmails" DROP DEFAULT,
ALTER COLUMN "twoFactorBackupCodes" DROP DEFAULT;
-- CreateTable EmailFilter ...
-- CreateTable Label ...
-- CreateTable MessageLabel ...
-- CreateIndex ...
-- AddForeignKey ...
*/
