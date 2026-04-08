-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditOutcome') THEN
    CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS';

-- Backfill from existing boolean success flag
UPDATE "AuditLog"
SET "outcome" = CASE WHEN "success" = true THEN 'SUCCESS'::"AuditOutcome" ELSE 'FAILURE'::"AuditOutcome" END
WHERE "outcome" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_outcome_idx" ON "AuditLog"("outcome");
