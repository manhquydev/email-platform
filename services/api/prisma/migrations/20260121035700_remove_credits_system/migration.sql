-- Remove Credits System
-- This migration removes the credits-related tables and columns

-- Drop CreditTransaction table
DROP TABLE IF EXISTS "CreditTransaction";

-- Remove credits column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "credits";

-- Remove creditAmount from ServicePackage
ALTER TABLE "ServicePackage" DROP COLUMN IF EXISTS "creditAmount";

-- Drop CreditTransactionType enum
DROP TYPE IF EXISTS "CreditTransactionType";
