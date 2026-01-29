-- CreateEnum
CREATE TYPE "ProviderTier" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('LITE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateTable
CREATE TABLE "HostingProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "tier" "ProviderTier" NOT NULL DEFAULT 'STARTER',
    "maxTenants" INTEGER NOT NULL DEFAULT 100,
    "maxMailboxes" INTEGER NOT NULL DEFAULT 1000,
    "maxStorageGb" INTEGER NOT NULL DEFAULT 100,
    "billingEmail" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTenant" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "plan" "TenantPlan" NOT NULL DEFAULT 'LITE',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxMailboxes" INTEGER NOT NULL DEFAULT 5,
    "maxStorageGb" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUsageLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "mailboxes" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostingProvider_apiKeyHash_key" ON "HostingProvider"("apiKeyHash");

-- CreateIndex
CREATE INDEX "HostingProvider_apiKeyPrefix_idx" ON "HostingProvider"("apiKeyPrefix");

-- CreateIndex
CREATE INDEX "ProviderTenant_providerId_idx" ON "ProviderTenant"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTenant_providerId_externalId_key" ON "ProviderTenant"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_providerId_idx" ON "ProviderUsageLog"("providerId");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_period_idx" ON "ProviderUsageLog"("period");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUsageLog_providerId_tenantId_period_key" ON "ProviderUsageLog"("providerId", "tenantId", "period");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_providerId_idx" ON "ProviderWebhookEvent"("providerId");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_status_idx" ON "ProviderWebhookEvent"("status");

-- AddForeignKey
ALTER TABLE "ProviderTenant" ADD CONSTRAINT "ProviderTenant_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUsageLog" ADD CONSTRAINT "ProviderUsageLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWebhookEvent" ADD CONSTRAINT "ProviderWebhookEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
