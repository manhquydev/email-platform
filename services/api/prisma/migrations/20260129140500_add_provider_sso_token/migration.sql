-- CreateTable
CREATE TABLE "ProviderSsoToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientIp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSsoToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSsoToken_token_key" ON "ProviderSsoToken"("token");

-- CreateIndex
CREATE INDEX "ProviderSsoToken_token_idx" ON "ProviderSsoToken"("token");

-- CreateIndex
CREATE INDEX "ProviderSsoToken_expiresAt_idx" ON "ProviderSsoToken"("expiresAt");
