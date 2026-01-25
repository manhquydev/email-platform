-- Migration: Add GIN index for ephemeral inbox token lookups
-- Phase 6 Security Fix: Prevent full table scans on flags JSONB column

-- Create GIN index on Inbox.flags for fast JSON path queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_flags_gin ON "Inbox" USING GIN (flags);

-- Create specific index for ephemeral token lookups (more efficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_ephemeral_token ON "Inbox" ((flags->>'token')) WHERE flags->>'isEphemeral' = 'true';

-- Create index for alias lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_alias_flag ON "Inbox" ((flags->>'isAlias')) WHERE flags->>'isAlias' = 'true';
