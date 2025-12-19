-- Create migration for public tier self-service onboarding
-- Step 2.1: Self-Service Onboarding System

-- Add public tier fields to existing User table
ALTER TABLE "User"
ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "source" TEXT,
ADD COLUMN "resetToken" TEXT,
ADD COLUMN "resetExpiresAt" TIMESTAMP(3);

-- Create user_quotas table for tier-based limits
CREATE TABLE "user_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxDomains" INTEGER NOT NULL DEFAULT 1,
    "maxInboxes" INTEGER NOT NULL DEFAULT 10,
    "maxEmailsPerMonth" INTEGER NOT NULL DEFAULT 100,
    "emailRetentionHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("id")
);

-- Create usage_trackers table for monitoring
CREATE TABLE "usage_trackers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_trackers_pkey" PRIMARY KEY ("id")
);

-- Create referral_codes table for referral program
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrerId" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "user_quotas_userId_key" ON "user_quotas"("userId");
CREATE INDEX "usage_trackers_userId_idx" ON "usage_trackers"("userId");
CREATE INDEX "usage_trackers_metric_idx" ON "usage_trackers"("metric");
CREATE INDEX "usage_trackers_period_idx" ON "usage_trackers"("period");
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");
CREATE INDEX "referral_codes_referrerId_idx" ON "referral_codes"("referrerId");

-- Add foreign key constraints
ALTER TABLE "user_quotas" ADD CONSTRAINT "user_quotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_trackers" ADD CONSTRAINT "usage_trackers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default quotas for existing users
INSERT INTO "user_quotas" ("id", "userId", "maxDomains", "maxInboxes", "maxEmailsPerMonth", "emailRetentionHours")
SELECT
    gen_random_uuid()::text,
    "id",
    CASE
        WHEN role = 'ADMIN' THEN 100
        ELSE 1
    END,
    CASE
        WHEN role = 'ADMIN' THEN 1000
        ELSE 10
    END,
    CASE
        WHEN role = 'ADMIN' THEN 10000
        ELSE 100
    END,
    CASE
        WHEN role = 'ADMIN' THEN 168 -- 1 week
        ELSE 24
    END
FROM "User";

-- Create audit log entry for migration
INSERT INTO "AuditLog" ("id", "action", "meta", "createdAt")
VALUES (
    gen_random_uuid()::text,
    'MIGRATION_PUBLIC_TIER',
    '{"migration": "20241219020000_add_public_tier_tables", "description": "Added public tier self-service onboarding tables"}',
    CURRENT_TIMESTAMP
);