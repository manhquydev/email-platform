-- Add indexes for public inbox viewer analytics queries
-- These indexes optimize JSON field queries on AuditLog table

-- Index for filtering by IP address in meta JSON field
CREATE INDEX IF NOT EXISTS "AuditLog_meta_ip_idx"
ON "AuditLog" USING BTREE ((meta->>'ip'));

-- Index for filtering by session ID in meta JSON field
CREATE INDEX IF NOT EXISTS "AuditLog_meta_sessionId_idx"
ON "AuditLog" USING BTREE ((meta->>'sessionId'));

-- Index for filtering by email in meta JSON field
CREATE INDEX IF NOT EXISTS "AuditLog_meta_email_idx"
ON "AuditLog" USING BTREE ((meta->>'email'));

-- Composite index for common queries (action + createdAt)
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx"
ON "AuditLog" ("action", "createdAt" DESC);

-- Index for PUBLIC_* action filtering
CREATE INDEX IF NOT EXISTS "AuditLog_action_public_idx"
ON "AuditLog" ("action") WHERE action LIKE 'PUBLIC_%';
