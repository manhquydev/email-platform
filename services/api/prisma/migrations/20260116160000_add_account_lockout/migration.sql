-- Add account lockout fields for brute-force protection
-- After 5 failed attempts, account is locked for 15 minutes

ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Index for efficient lockout cleanup queries
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil") WHERE "lockedUntil" IS NOT NULL;
