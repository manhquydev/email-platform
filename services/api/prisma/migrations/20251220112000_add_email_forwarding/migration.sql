-- AlterTable: Add verifiedForwardEmails to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedForwardEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: ForwardingRule
CREATE TABLE IF NOT EXISTS "ForwardingRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inboxId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Unnamed Rule',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "forwardTo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forwardCount" INTEGER NOT NULL DEFAULT 0,
    "lastForwardAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForwardingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForwardVerification
CREATE TABLE IF NOT EXISTS "ForwardVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForwardVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ForwardingRule
DROP INDEX IF EXISTS "ForwardingRule_userId_isActive_idx";
CREATE INDEX "ForwardingRule_userId_isActive_idx" ON "ForwardingRule"("userId", "isActive");

DROP INDEX IF EXISTS "ForwardingRule_inboxId_idx";
CREATE INDEX "ForwardingRule_inboxId_idx" ON "ForwardingRule"("inboxId");

-- CreateIndex: ForwardVerification
DROP INDEX IF EXISTS "ForwardVerification_userId_email_key";
CREATE UNIQUE INDEX "ForwardVerification_userId_email_key" ON "ForwardVerification"("userId", "email");

DROP INDEX IF EXISTS "ForwardVerification_email_code_idx";
CREATE INDEX "ForwardVerification_email_code_idx" ON "ForwardVerification"("email", "code");

-- AddForeignKey: ForwardingRule
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ForwardingRule_userId_fkey'
    ) THEN
        ALTER TABLE "ForwardingRule" ADD CONSTRAINT "ForwardingRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ForwardingRule_inboxId_fkey'
    ) THEN
        ALTER TABLE "ForwardingRule" ADD CONSTRAINT "ForwardingRule_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ForwardVerification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ForwardVerification_userId_fkey'
    ) THEN
        ALTER TABLE "ForwardVerification" ADD CONSTRAINT "ForwardVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
