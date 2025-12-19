-- Add notification model for quota warnings and user notifications
-- Part of Step 2.2: Free Tier Limitations

-- Create notification table
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create indexes for notifications
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- Add foreign key constraint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add settings field to User table for storing notification preferences
ALTER TABLE "User" ADD COLUMN "settings" JSONB;

-- Create audit log entry for migration
INSERT INTO "AuditLog" ("id", "action", "meta", "createdAt")
VALUES (
    gen_random_uuid()::text,
    'MIGRATION_NOTIFICATION_MODEL',
    '{"migration": "20241219030000_add_notification_model", "description": "Added notification model for quota warnings"}',
    CURRENT_TIMESTAMP
);