-- Add sharing fields to Domain and Inbox models

-- Domain: Add sharedAt and shareNote columns  
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "sharedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "shareNote" TEXT;

-- Inbox: Add claimedAt column with default value
ALTER TABLE "Inbox" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Update existing inboxes to have claimedAt = createdAt
UPDATE "Inbox" SET "claimedAt" = "createdAt" WHERE "claimedAt" IS NULL;
