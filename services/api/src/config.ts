import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

// Zod schema for environment variable validation
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  TOTP_ENCRYPTION_KEY: z.string().length(64, "TOTP_ENCRYPTION_KEY must be exactly 64 hex characters").regex(/^[0-9a-fA-F]+$/, "TOTP_ENCRYPTION_KEY must be valid hex").optional(),
  HTTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

// Validate environment variables in production
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }
}

const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
};

const list = (name: string, fallback = "") =>
  (process.env[name] ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const lower = (values: string[]) => values.map((v) => v.toLowerCase());

/**
 * Get TOTP encryption key with validation
 * Production: requires explicit key, rejects weak/missing keys
 * Development: allows insecure default with warning
 */
const getTotpEncryptionKey = (): string => {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (key) {
    if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
      console.error('❌ TOTP_ENCRYPTION_KEY must be 64 hex chars');
      process.exit(1);
    }
    if (isProduction && /^0+$/.test(key)) {
      console.error('❌ TOTP_ENCRYPTION_KEY cannot be all zeros in production');
      console.error('   Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }
    return key;
  }
  if (isProduction) {
    console.error('❌ TOTP_ENCRYPTION_KEY required in production');
    console.error('   Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  console.warn('⚠️  Using insecure default TOTP key - dev only!');
  return '0'.repeat(64);
};

export const appConfig = {
  hostname: process.env.HOSTNAME || process.env.MAIL_HOSTNAME || "ephemera.email",
  databaseUrl: required("DATABASE_URL"),
  databaseReadUrl: process.env.DATABASE_READ_URL || process.env.DATABASE_URL, // Read replica URL
  jwtSecret: required("JWT_SECRET"),
  httpPort: Number(process.env.HTTP_PORT ?? 3001),
  smtpPort: Number(process.env.SMTP_PORT ?? 2525),
  allowAutoDomainCreation: (process.env.ALLOW_AUTO_DOMAIN_CREATION ?? "false").toLowerCase() === "true",
  storageDir: required("STORAGE_DIR", "./storage"),
  defaultAdminEmail: required("DEFAULT_ADMIN_EMAIL", "admin@example.com"),
  defaultAdminPassword: required("DEFAULT_ADMIN_PASSWORD", "changeme"),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW ?? "1 minute",
  maxAttachmentBytes: Number(process.env.MAX_ATTACHMENT_BYTES ?? 5 * 1024 * 1024),
  quotaMessagesPerInbox: Number(process.env.QUOTA_MESSAGES_PER_INBOX ?? 500),
  quotaMessagesPerDomain: Number(process.env.QUOTA_MESSAGES_PER_DOMAIN ?? 5000),
  messageTtlHours: Number(process.env.MESSAGE_TTL_HOURS ?? 24 * 7),
  inboxTtlHours: Number(process.env.INBOX_TTL_HOURS ?? 24 * 7),
  blockedSenderDomains: (process.env.BLOCKED_SENDER_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  retentionSweepMinutes: Number(process.env.RETENTION_SWEEP_MINUTES ?? 5),
  smtpRateLimit: {
    windowMinutes: Number(process.env.SMTP_RATE_WINDOW_MINUTES ?? 5),
    perIp: Number(process.env.SMTP_RATE_LIMIT_PER_IP ?? 300),
    perDomain: Number(process.env.SMTP_RATE_LIMIT_PER_DOMAIN ?? 500),
    perInbox: Number(process.env.SMTP_RATE_LIMIT_PER_INBOX ?? 200),
  },
  allowedAttachmentMimePrefixes: lower(list("ALLOWED_ATTACHMENT_MIME_PREFIXES", "image/,text/plain,application/pdf")),
  allowedAttachmentExtensions: lower(list("ALLOWED_ATTACHMENT_EXTENSIONS", "txt,eml,pdf,png,jpg,jpeg")),
  publicInboxEnabled: (process.env.PUBLIC_INBOX_ENABLED ?? "false").toLowerCase() === "true",
  requireCaptchaForPublicInbox: (process.env.REQUIRE_CAPTCHA_FOR_PUBLIC_INBOX ?? "false").toLowerCase() === "true",
  captchaSecret: process.env.CAPTCHA_SECRET,
  webUrl: process.env.WEB_URL ?? "http://localhost:5173",
  trustProxy: (process.env.TRUST_PROXY ?? "true").toLowerCase() === "true",
  // Google API Fallback
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  outboundEnabled: (process.env.OUTBOUND_ENABLED ?? "false").toLowerCase() === "true",
  mailDomain: process.env.MAIL_DOMAIN ?? "localhost",
  mailFromName: process.env.MAIL_FROM_NAME ?? "Ephemera",
  mailFromAddress: process.env.MAIL_FROM_ADDRESS ?? "noreply@localhost",
  // TOTP secret encryption key (32 bytes = 64 hex chars for AES-256)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  totpEncryptionKey: getTotpEncryptionKey(),
  // Set to false to temporarily disable email verification requirement
  requireEmailVerification: (process.env.REQUIRE_EMAIL_VERIFICATION ?? "true").toLowerCase() === "true",
  s3: {
    enabled: (process.env.S3_ENABLED ?? "false").toLowerCase() === "true",
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  stripe: {
    enabled: (process.env.STRIPE_ENABLED ?? "false").toLowerCase() === "true",
    apiKey: process.env.STRIPE_API_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },
  sepay: {
    enabled: (process.env.SEPAY_ENABLED ?? "true").toLowerCase() === "true",
    merchantId: process.env.SEPAY_MERCHANT_ID ?? "",
    apiToken: process.env.SEPAY_API_TOKEN ?? "",
    secretKey: process.env.SEPAY_SECRET_KEY ?? "",
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? "",
    bankBrand: process.env.SEPAY_BANK_BRAND ?? "MBBank",
  },
  // AI/Gemini API configuration
  ai: {
    enabled: (process.env.AI_ENABLED ?? "false").toLowerCase() === "true",
    provider: process.env.AI_PROVIDER ?? "gemini", // gemini, openai
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    summaryCreditCost: Number(process.env.AI_SUMMARY_CREDIT_COST ?? 1),
  },
};
