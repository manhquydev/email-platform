-- Add OTP-related fields to Message
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "otpConfidence" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "otpExtractedAt" TIMESTAMP(3);
