-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram-based full-text search
CREATE INDEX IF NOT EXISTS idx_message_subject_trgm 
ON "Message" USING GIN (subject gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_message_textbody_trgm 
ON "Message" USING GIN ("textBody" gin_trgm_ops);
