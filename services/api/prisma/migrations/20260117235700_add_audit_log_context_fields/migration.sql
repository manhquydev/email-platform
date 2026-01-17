-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_ip_idx" ON "AuditLog"("ip");
CREATE INDEX IF NOT EXISTS "AuditLog_success_idx" ON "AuditLog"("success");
