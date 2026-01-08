-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramFirstName" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramPhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramAuthDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
