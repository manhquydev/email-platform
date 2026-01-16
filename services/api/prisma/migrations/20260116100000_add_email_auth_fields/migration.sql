-- Add SPF, DKIM, and DMARC authentication result fields to Message table
-- These fields store the email authentication status from Rspamd analysis

ALTER TABLE "Message" ADD COLUMN "spfResult" TEXT;
ALTER TABLE "Message" ADD COLUMN "dkimResult" TEXT;
ALTER TABLE "Message" ADD COLUMN "dmarcResult" TEXT;

-- Add index for filtering by authentication status (useful for security reporting)
CREATE INDEX "Message_spfResult_idx" ON "Message"("spfResult") WHERE "spfResult" IS NOT NULL;
CREATE INDEX "Message_dkimResult_idx" ON "Message"("dkimResult") WHERE "dkimResult" IS NOT NULL;
CREATE INDEX "Message_dmarcResult_idx" ON "Message"("dmarcResult") WHERE "dmarcResult" IS NOT NULL;
