-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "ContributionStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable safely
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "contributionStatus" "ContributionStatus" NOT NULL DEFAULT 'NONE';
