-- Add BUSINESS tier to SubscriptionTier enum
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'BUSINESS' BEFORE 'ENTERPRISE';
