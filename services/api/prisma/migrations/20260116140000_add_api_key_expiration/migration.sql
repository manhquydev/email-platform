-- Add expiration support to API keys for enhanced security
-- Keys with expiresAt set will be rejected after that date

ALTER TABLE "ApiKey" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Index for efficient expired key cleanup queries
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt") WHERE "expiresAt" IS NOT NULL;
