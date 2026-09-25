-- Phase 5.1: Performance Optimization - Add Missing Indexes
-- Created: 2025-12-20
-- Purpose: Optimize database queries for better performance

-- Create performance indexes for Message table
-- These indexes are based on common query patterns identified in the performance analysis

-- 1. Optimized inbox query with sorting (most common query)
CREATE INDEX CONCURRENTLY idx_messages_inbox_received_desc
ON messages (inboxId, receivedAt DESC, deletedAt NULLS LAST);

-- 2. Optimized user messages with pagination
CREATE INDEX CONCURRENTLY idx_messages_user_received_desc
ON messages (userId, receivedAt DESC, deletedAt NULLS LAST)
WHERE userId IS NOT NULL;

-- 3. Optimized domain messages for admin dashboard
CREATE INDEX CONCURRENTLY idx_messages_domain_received_desc
ON messages (domainId, receivedAt DESC, deletedAt NULLS LAST)
WHERE domainId IS NOT NULL;

-- 4. Full-text search on subject and from address
CREATE INDEX CONCURRENTLY idx_messages_subject_gin
ON messages USING gin(to_tsvector('english', coalesce(subject, '')));

CREATE INDEX CONCURRENTLY idx_messages_from_gin
ON messages USING gin(to_tsvector('english', fromAddress));

-- 5. Compound index for unread/pinned filter queries
CREATE INDEX CONCURRENTLY idx_messages_inbox_read_pinned
ON messages (inboxId, isRead, isPinned, receivedAt DESC);

-- 6. Index for soft deletes (performance critical)
CREATE INDEX CONCURRENTLY idx_messages_deleted_at
ON messages (deletedAt DESC)
WHERE deletedAt IS NOT NULL;

-- 7. Index for bounce/reject tracking
CREATE INDEX CONCURRENTLY idx_messages_bounce_tracking
ON messages (bounced, bouncedAt, rejected, rejectedAt);

-- 8. Attachment lookup optimization
CREATE INDEX CONCURRENTLY idx_attachments_message_size
ON attachments (messageId, size DESC);

-- 9. Inbox search optimization
CREATE INDEX CONCURRENTLY idx_inboxes_name_search
ON inboxes USING gin(to_tsvector('english', name));

-- 10. Domain verification lookup
CREATE INDEX CONCURRENTLY idx_domains_verified_status
ON domains (verified, isPublic, createdAt DESC);

-- 11. User quota lookup (for B2B features)
CREATE INDEX CONCURRENTLY idx_user_quota_lookup
ON user_quotas (userId, maxEmailsPerMonth, emailRetentionHours);

-- 12. Analytics query optimization
CREATE INDEX CONCURRENTLY idx_messages_analytics_hourly
ON messages (date_trunc('hour', receivedAt), bounced, delivered);

-- Update statistics for better query planning
ANALYZE messages;
ANALYZE attachments;
ANALYZE inboxes;
ANALYZE domains;
ANALYZE user_quotas;

-- Create a view for common analytics queries
CREATE OR REPLACE VIEW message_stats_hourly AS
SELECT
  date_trunc('hour', receivedAt) as hour,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE bounced = true) as bounced_count,
  COUNT(*) FILTER (WHERE delivered = true) as delivered_count,
  COUNT(*) FILTER (WHERE deletedAt IS NULL) as active_count,
  AVG(LENGTH(textContent)) as avg_text_length
FROM messages
WHERE receivedAt > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', receivedAt)
ORDER BY hour DESC;

-- Create index for the view's underlying data
CREATE INDEX CONCURRENTLY idx_messages_received_at_hourly
ON messages (date_trunc('hour', receivedAt), receivedAt DESC);