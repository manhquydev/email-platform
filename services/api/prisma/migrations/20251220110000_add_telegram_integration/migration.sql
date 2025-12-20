-- AlterTable: Add Telegram integration fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramLinkedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyOnEmail" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Unique constraint on telegramChatId
DROP INDEX IF EXISTS "User_telegramChatId_key";
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateTable: TelegramLinkToken
CREATE TABLE IF NOT EXISTS "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DROP INDEX IF EXISTS "TelegramLinkToken_token_key";
CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");

DROP INDEX IF EXISTS "TelegramLinkToken_userId_idx";
CREATE INDEX "TelegramLinkToken_userId_idx" ON "TelegramLinkToken"("userId");

DROP INDEX IF EXISTS "TelegramLinkToken_token_idx";
CREATE INDEX "TelegramLinkToken_token_idx" ON "TelegramLinkToken"("token");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TelegramLinkToken_userId_fkey'
    ) THEN
        ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
