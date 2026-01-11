-- CreateEnum
CREATE TYPE "VisibilityRuleType" AS ENUM ('HIDE', 'SHOW_ONLY', 'WARN', 'REDACT');

-- CreateEnum
CREATE TYPE "VisibilityAction" AS ENUM ('SHOWN', 'HIDDEN', 'WARNED', 'REDACTED');

-- CreateTable
CREATE TABLE "VisibilityRule" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "ruleType" "VisibilityRuleType" NOT NULL,
    "matchType" "FilterMatchType" NOT NULL DEFAULT 'ALL',
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisibilityRuleTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "category" VARCHAR(50) NOT NULL,
    "ruleType" "VisibilityRuleType" NOT NULL,
    "matchType" "FilterMatchType" NOT NULL DEFAULT 'ALL',
    "conditions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisibilityRuleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageVisibilityAudit" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "action" "VisibilityAction" NOT NULL,
    "ruleId" TEXT,
    "ruleName" VARCHAR(100),
    "requestedBy" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageVisibilityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisibilityRule_inboxId_isEnabled_priority_idx" ON "VisibilityRule"("inboxId", "isEnabled", "priority");

-- CreateIndex
CREATE INDEX "VisibilityRuleTemplate_category_idx" ON "VisibilityRuleTemplate"("category");

-- CreateIndex
CREATE INDEX "MessageVisibilityAudit_inboxId_createdAt_idx" ON "MessageVisibilityAudit"("inboxId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageVisibilityAudit_messageId_idx" ON "MessageVisibilityAudit"("messageId");

-- AddForeignKey
ALTER TABLE "VisibilityRule" ADD CONSTRAINT "VisibilityRule_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
