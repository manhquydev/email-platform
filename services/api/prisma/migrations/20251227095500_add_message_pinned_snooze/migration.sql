-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_isPinned_idx" ON "Message"("isPinned");
