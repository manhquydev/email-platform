-- AlterTable: Add display configuration fields to ServicePackage
ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "recommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "badge" TEXT;
