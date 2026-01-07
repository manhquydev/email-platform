-- CreateTable
CREATE TABLE "InboxTelegramLink" (
    "id" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "InboxTelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxTelegramAuthToken" (
    "id" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxTelegramAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramNotificationLog" (
    "id" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxTelegramLink_inboxEmail_telegramChatId_key" ON "InboxTelegramLink"("inboxEmail", "telegramChatId");

-- CreateIndex
CREATE INDEX "InboxTelegramLink_inboxEmail_idx" ON "InboxTelegramLink"("inboxEmail");

-- CreateIndex
CREATE INDEX "InboxTelegramLink_telegramChatId_idx" ON "InboxTelegramLink"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxTelegramAuthToken_token_key" ON "InboxTelegramAuthToken"("token");

-- CreateIndex
CREATE INDEX "InboxTelegramAuthToken_token_idx" ON "InboxTelegramAuthToken"("token");

-- CreateIndex
CREATE INDEX "InboxTelegramAuthToken_inboxEmail_idx" ON "InboxTelegramAuthToken"("inboxEmail");

-- CreateIndex
CREATE INDEX "TelegramNotificationLog_inboxEmail_idx" ON "TelegramNotificationLog"("inboxEmail");

-- CreateIndex
CREATE INDEX "TelegramNotificationLog_telegramChatId_idx" ON "TelegramNotificationLog"("telegramChatId");

-- CreateIndex
CREATE INDEX "TelegramNotificationLog_messageId_idx" ON "TelegramNotificationLog"("messageId");
