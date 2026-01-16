-- Add performance indexes for frequently queried foreign keys and filter columns
-- These indexes improve query performance for admin dashboards, user lookups, and retention sweeps

-- Domain indexes
CREATE INDEX "Domain_ownerId_idx" ON "Domain"("ownerId");
CREATE INDEX "Domain_status_idx" ON "Domain"("status");

-- Attachment indexes (improve message detail queries)
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");

-- AuditLog indexes (improve admin audit queries)
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
