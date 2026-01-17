-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fuzzy search on Message table
CREATE INDEX IF NOT EXISTS "Message_subject_trgm_idx" ON "Message" USING GIN (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Message_fromAddress_trgm_idx" ON "Message" USING GIN ("fromAddress" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Message_toAddress_trgm_idx" ON "Message" USING GIN ("toAddress" gin_trgm_ops);

-- Composite index for common query pattern (inboxId + receivedAt for cursor pagination)
CREATE INDEX IF NOT EXISTS "Message_inbox_cursor_idx" ON "Message" ("inboxId", "receivedAt" DESC, "id");
