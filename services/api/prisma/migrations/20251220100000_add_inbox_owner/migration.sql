-- Add ownerId to Inbox table for email ownership tracking

-- Step 1: Add the ownerId column (nullable)
ALTER TABLE "Inbox" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- Step 2: Create foreign key constraint
-- Use IF NOT EXISTS pattern via DO block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Inbox_ownerId_fkey'
    ) THEN
        ALTER TABLE "Inbox" 
        ADD CONSTRAINT "Inbox_ownerId_fkey" 
        FOREIGN KEY ("ownerId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END
$$;

-- Step 3: Create index for ownerId
CREATE INDEX IF NOT EXISTS "Inbox_ownerId_idx" ON "Inbox"("ownerId");

-- Step 4: Backfill existing inboxes with domain owner
-- This assigns ownership of existing inboxes to the domain owner
UPDATE "Inbox" i 
SET "ownerId" = d."ownerId" 
FROM "Domain" d 
WHERE i."domainId" = d."id" 
  AND i."ownerId" IS NULL 
  AND d."ownerId" IS NOT NULL;
