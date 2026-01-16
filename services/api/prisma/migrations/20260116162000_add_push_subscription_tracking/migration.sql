-- Add lastSuccessfulSend tracking to PushSubscription for stale subscription pruning

ALTER TABLE "PushSubscription" ADD COLUMN "lastSuccessfulSend" TIMESTAMP(3);

-- Index for efficient stale subscription cleanup queries
CREATE INDEX "PushSubscription_lastSuccessfulSend_idx" ON "PushSubscription"("lastSuccessfulSend") WHERE "lastSuccessfulSend" IS NOT NULL;
