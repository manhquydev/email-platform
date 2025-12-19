-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN "contributionStatus" "ContributionStatus" NOT NULL DEFAULT 'NONE';
