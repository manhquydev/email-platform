/*
  Warnings:

  - Made the column `claimedAt` on table `Inbox` required. This step will fail if there are existing NULL values in that column.

*/
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

-- CreateTable
CREATE TABLE "PasskeyCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFilter" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "matchType" "FilterMatchType" NOT NULL DEFAULT 'ALL',
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLabel" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyCredential_credentialID_key" ON "PasskeyCredential"("credentialID");

-- CreateIndex
CREATE INDEX "PasskeyCredential_userId_idx" ON "PasskeyCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_token_idx" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "EmailFilter_inboxId_isEnabled_idx" ON "EmailFilter"("inboxId", "isEnabled");

-- CreateIndex
CREATE INDEX "Label_inboxId_idx" ON "Label"("inboxId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_inboxId_name_key" ON "Label"("inboxId", "name");

-- CreateIndex
CREATE INDEX "MessageLabel_labelId_idx" ON "MessageLabel"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLabel_messageId_labelId_key" ON "MessageLabel"("messageId", "labelId");

-- CreateIndex
CREATE INDEX "Message_isPinned_idx" ON "Message"("isPinned");

-- AddForeignKey
ALTER TABLE "PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailFilter" ADD CONSTRAINT "EmailFilter_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLabel" ADD CONSTRAINT "MessageLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLabel" ADD CONSTRAINT "MessageLabel_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
