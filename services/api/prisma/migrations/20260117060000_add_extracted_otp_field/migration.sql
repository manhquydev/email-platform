-- Add extractedOtp field to Message for OTP caching
ALTER TABLE "Message" ADD COLUMN "extractedOtp" TEXT;

-- Add index for OTP queries
CREATE INDEX "Message_extractedOtp_idx" ON "Message"("extractedOtp");
