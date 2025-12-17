import { config as loadEnv } from "dotenv";

loadEnv();

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

export const appConfig = {
  databaseUrl: required("DATABASE_URL"),
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
  outboundEnabled: (process.env.OUTBOUND_ENABLED ?? "false").toLowerCase() === "true",
  mailDomain: process.env.MAIL_DOMAIN ?? "localhost",
  mailFromName: process.env.MAIL_FROM_NAME ?? "TempMail Pro",
  mailFromAddress: process.env.MAIL_FROM_ADDRESS ?? "noreply@localhost",
  // TOTP secret encryption key (32 bytes = 64 hex chars for AES-256)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY ?? "0".repeat(64), // Default for dev only!
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
};
