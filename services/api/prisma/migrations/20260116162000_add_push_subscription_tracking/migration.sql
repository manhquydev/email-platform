-- CreateTable: PushSubscription (if not exists, create full table including lastSuccessfulSend)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessfulSend" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- Create unique index on endpoint
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- Create index on userId
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- Index for efficient stale subscription cleanup queries
CREATE INDEX IF NOT EXISTS "PushSubscription_lastSuccessfulSend_idx" ON "PushSubscription"("lastSuccessfulSend") WHERE "lastSuccessfulSend" IS NOT NULL;
