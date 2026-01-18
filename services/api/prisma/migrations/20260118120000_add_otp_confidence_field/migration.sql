-- Add otpConfidence field to Message for OTP confidence level
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "otpConfidence" TEXT;
