-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "BounceType" AS ENUM ('HARD', 'SOFT', 'COMPLAINT');

-- CreateTable
CREATE TABLE "DomainDkim" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'rsa-sha256',
    "keySize" INTEGER NOT NULL DEFAULT 2048,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "DomainDkim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "inboxId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "messageId" TEXT NOT NULL,
    "status" "OutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "bounceType" "BounceType",
    "bounceSubType" TEXT,
    "bounceMessage" TEXT,
    "complaintType" TEXT,
    "espMessageId" TEXT,
    "espProvider" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BounceSuppressionList" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BounceSuppressionList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainDkim_domainId_key" ON "DomainDkim"("domainId");

-- CreateIndex
CREATE INDEX "DomainDkim_domainId_idx" ON "DomainDkim"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_messageId_key" ON "OutboundMessage"("messageId");

-- CreateIndex
CREATE INDEX "OutboundMessage_userId_idx" ON "OutboundMessage"("userId");

-- CreateIndex
CREATE INDEX "OutboundMessage_domainId_idx" ON "OutboundMessage"("domainId");

-- CreateIndex
CREATE INDEX "OutboundMessage_status_idx" ON "OutboundMessage"("status");

-- CreateIndex
CREATE INDEX "OutboundMessage_espMessageId_idx" ON "OutboundMessage"("espMessageId");

-- CreateIndex
CREATE INDEX "OutboundMessage_toAddress_idx" ON "OutboundMessage"("toAddress");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BounceSuppressionList_email_key" ON "BounceSuppressionList"("email");

-- CreateIndex
CREATE INDEX "BounceSuppressionList_email_idx" ON "BounceSuppressionList"("email");

-- CreateIndex
CREATE INDEX "BounceSuppressionList_expiresAt_idx" ON "BounceSuppressionList"("expiresAt");

-- AddForeignKey
ALTER TABLE "DomainDkim" ADD CONSTRAINT "DomainDkim_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
