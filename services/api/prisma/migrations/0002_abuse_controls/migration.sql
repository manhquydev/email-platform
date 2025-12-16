-- Enums
CREATE TYPE "RuleType" AS ENUM ('ALLOW', 'BLOCK');
CREATE TYPE "RuleScope" AS ENUM ('SENDER_DOMAIN', 'SENDER_EMAIL', 'RECIPIENT_DOMAIN', 'RECIPIENT_INBOX', 'SOURCE_IP');
CREATE TYPE "AbuseReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'CLOSED');

-- Soft delete + source IP
ALTER TABLE "Inbox" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "sourceIp" TEXT;
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Attachment" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Rules table
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "scope" "RuleScope" NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Rule_scope_value_idx" ON "Rule"("scope", "value");

-- Abuse reports
CREATE TABLE "AbuseReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "reporter" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AbuseReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AbuseReport_status_idx" ON "AbuseReport"("status");
CREATE INDEX "AbuseReport_messageId_idx" ON "AbuseReport"("messageId");

-- Relationships
ALTER TABLE "AbuseReport"
ADD CONSTRAINT "AbuseReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for rate limits/cleanup
CREATE INDEX "Message_sourceIp_receivedAt_idx" ON "Message"("sourceIp", "receivedAt");
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");
