-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "bounced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "bounceReason" TEXT,
ADD COLUMN     "complained" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "complainedAt" TIMESTAMP(3),
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "field" TEXT,
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reason" TEXT;

-- DropIndex
DROP INDEX "Rule_scope_value_idx";

-- CreateIndex
CREATE INDEX "Message_bounced_idx" ON "Message"("bounced");

-- CreateIndex
CREATE INDEX "Message_complained_idx" ON "Message"("complained");

-- CreateIndex
CREATE INDEX "Rule_scope_pattern_idx" ON "Rule"("scope", "pattern");

-- CreateIndex
CREATE INDEX "Rule_active_idx" ON "Rule"("active");