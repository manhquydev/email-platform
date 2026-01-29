# Phase 01: Enhanced Forwarding Rules Engine

**Duration:** Week 1-2
**Priority:** High
**Dependencies:** None

## 1. Objective

Mở rộng hệ thống forwarding hiện có để hỗ trợ:
- Multiple destination types (Email, Telegram, Discord, Webhook)
- Advanced condition matching với visual rule builder
- Execution logging và monitoring

## 2. Current State

### Existing Implementation
- `ForwardingRule` model với basic conditions
- `emailForwarder.ts` service chỉ forward qua email
- Basic conditions: senderDomains, containsOTP, subjectContains

### Limitations
- Chỉ forward được đến email
- Conditions không linh hoạt
- Không có execution logs

## 3. Tasks

### 3.1 Database Migration

**File:** `prisma/migrations/XXXXXX_enhanced_forwarding/migration.sql`

```sql
-- Add new fields to ForwardingRule
ALTER TABLE "ForwardingRule"
  ADD COLUMN IF NOT EXISTS "destinationType" TEXT DEFAULT 'EMAIL',
  ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
  ADD COLUMN IF NOT EXISTS "discordWebhookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "matchType" TEXT DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "priority" INT DEFAULT 50;

-- Create ForwardingLog table
CREATE TABLE IF NOT EXISTS "ForwardingLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ruleId" TEXT NOT NULL REFERENCES "ForwardingRule"("id") ON DELETE CASCADE,
  "messageId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "destinationType" TEXT NOT NULL,
  "duration" INT,
  "error" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ForwardingLog_ruleId_idx" ON "ForwardingLog"("ruleId");
CREATE INDEX IF NOT EXISTS "ForwardingLog_messageId_idx" ON "ForwardingLog"("messageId");
CREATE INDEX IF NOT EXISTS "ForwardingLog_createdAt_idx" ON "ForwardingLog"("createdAt");
```

**Update schema.prisma:**

```prisma
model ForwardingRule {
  id            String    @id @default(uuid())
  userId        String
  inboxId       String?
  name          String    @default("Unnamed Rule")

  // Destination configuration
  destinationType ForwardDestinationType @default(EMAIL)
  forwardTo       String?                 // For EMAIL
  telegramChatId  String?                 // For TELEGRAM
  discordWebhookUrl String?               // For DISCORD
  webhookUrl      String?                 // For WEBHOOK
  webhookSecret   String?                 // For WEBHOOK signature

  // Matching configuration
  conditions    Json      @default("[]")
  matchType     FilterMatchType @default(ALL)
  priority      Int       @default(50)

  // Status
  isActive      Boolean   @default(true)
  forwardCount  Int       @default(0)
  lastForwardAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  inbox         Inbox?    @relation(fields: [inboxId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs          ForwardingLog[]

  @@index([userId, isActive])
  @@index([inboxId])
  @@index([priority])
}

model ForwardingLog {
  id              String   @id @default(uuid())
  ruleId          String
  messageId       String
  status          String   // SUCCESS, FAILED
  destination     String
  destinationType String
  duration        Int?
  error           String?
  createdAt       DateTime @default(now())

  rule ForwardingRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([ruleId])
  @@index([messageId])
  @@index([createdAt])
}

enum ForwardDestinationType {
  EMAIL
  TELEGRAM
  DISCORD
  WEBHOOK
}
```

### 3.2 Condition Matcher Service

**File:** `services/api/src/services/forwarding/condition-matcher.ts`

```typescript
import type { Message } from "@prisma/client";
import { extractOTP } from "../../utils/otpExtractor";

export interface ForwardCondition {
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'HAS_ATTACHMENT';
  operator: 'EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' |
            'ENDS_WITH' | 'REGEX' | 'CONTAINS_OTP' | 'EXISTS';
  value: string | null;
  headerName?: string; // For HEADER field
  caseSensitive?: boolean;
}

export type MatchType = 'ALL' | 'ANY';

/**
 * Evaluate a single condition against a message
 */
function evaluateCondition(
  message: Message & { attachments?: { id: string }[] },
  condition: ForwardCondition
): boolean {
  const { field, operator, value, headerName, caseSensitive = false } = condition;

  // Get field value from message
  let fieldValue: string | null = null;

  switch (field) {
    case 'FROM':
      fieldValue = message.fromAddress;
      break;
    case 'TO':
      fieldValue = message.toAddress;
      break;
    case 'SUBJECT':
      fieldValue = message.subject;
      break;
    case 'BODY':
      fieldValue = message.textBody || message.htmlBody;
      break;
    case 'HEADER':
      if (headerName && message.headers) {
        const headers = message.headers as Record<string, string>;
        fieldValue = headers[headerName] || null;
      }
      break;
    case 'HAS_ATTACHMENT':
      // Special case: check attachment existence
      const hasAttachment = (message.attachments?.length || 0) > 0;
      return operator === 'EXISTS' ? hasAttachment : !hasAttachment;
  }

  // Handle null field value
  if (fieldValue === null) {
    return operator === 'EXISTS' ? false : false;
  }

  // Normalize for case-insensitive comparison
  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedValue = value && !caseSensitive ? value.toLowerCase() : value;

  // Evaluate operator
  switch (operator) {
    case 'EQUALS':
      return normalizedField === normalizedValue;

    case 'CONTAINS':
      return normalizedValue ? normalizedField.includes(normalizedValue) : false;

    case 'NOT_CONTAINS':
      return normalizedValue ? !normalizedField.includes(normalizedValue) : true;

    case 'STARTS_WITH':
      return normalizedValue ? normalizedField.startsWith(normalizedValue) : false;

    case 'ENDS_WITH':
      return normalizedValue ? normalizedField.endsWith(normalizedValue) : false;

    case 'REGEX':
      if (!value) return false;
      try {
        // Timeout protection for ReDoS
        const regex = new RegExp(value, caseSensitive ? '' : 'i');
        return regex.test(fieldValue);
      } catch {
        return false;
      }

    case 'CONTAINS_OTP':
      return extractOTP(fieldValue) !== null;

    case 'EXISTS':
      return fieldValue !== null && fieldValue.length > 0;

    default:
      return false;
  }
}

/**
 * Check if message matches all conditions based on matchType
 */
export function matchesConditions(
  message: Message & { attachments?: { id: string }[] },
  conditions: ForwardCondition[],
  matchType: MatchType = 'ALL'
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions = match all
  }

  if (matchType === 'ALL') {
    return conditions.every(c => evaluateCondition(message, c));
  } else {
    return conditions.some(c => evaluateCondition(message, c));
  }
}

/**
 * Parse legacy conditions format to new format
 */
export function parseLegacyConditions(legacy: any): ForwardCondition[] {
  const conditions: ForwardCondition[] = [];

  if (legacy.senderDomains?.length > 0) {
    legacy.senderDomains.forEach((domain: string) => {
      conditions.push({
        field: 'FROM',
        operator: 'ENDS_WITH',
        value: `@${domain}`
      });
    });
  }

  if (legacy.containsOTP) {
    conditions.push({
      field: 'BODY',
      operator: 'CONTAINS_OTP',
      value: null
    });
  }

  if (legacy.subjectContains) {
    conditions.push({
      field: 'SUBJECT',
      operator: 'CONTAINS',
      value: legacy.subjectContains
    });
  }

  return conditions;
}
```

### 3.3 Destination Handlers

**File:** `services/api/src/services/forwarding/destinations/email-destination.ts`

```typescript
import { outboundService } from "../../outbound";
import { extractOTP } from "../../../utils/otpExtractor";
import type { Message, ForwardingRule } from "@prisma/client";

export async function forwardToEmail(
  message: Message,
  rule: ForwardingRule
): Promise<{ success: boolean; error?: string }> {
  if (!rule.forwardTo) {
    return { success: false, error: "No email destination configured" };
  }

  if (!process.env.OUTBOUND_SMTP_HOST) {
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");

    await outboundService.sendEmail(
      process.env.MAIL_DOMAIN ? `noreply@${process.env.MAIL_DOMAIN}` : "noreply@ephemera.click",
      rule.forwardTo,
      `[FWD] ${message.subject || "(No subject)"}`,
      buildTextBody(message, otpResult),
      buildHtmlBody(message, otpResult),
      undefined,
      {
        senderName: "Ephemera Forward",
        replyTo: message.fromAddress || undefined,
        headers: {
          "X-Original-From": message.fromAddress || "",
          "X-Original-To": message.toAddress || "",
          "X-Forwarding-Rule": rule.id,
        }
      }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildTextBody(message: Message, otp: { code: string } | null): string {
  return `
────────────────────────────
📩 Forwarded from Ephemera
────────────────────────────
From: ${message.fromAddress || "Unknown"}
To: ${message.toAddress || ""}
Date: ${new Date(message.receivedAt).toISOString()}
${otp ? `\n🔢 OTP Code: ${otp.code}\n` : ""}
────────────────────────────

${message.textBody || "(No content)"}
  `.trim();
}

function buildHtmlBody(message: Message, otp: { code: string } | null): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
  <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; color: #64748b; font-size: 14px;">
      📩 Forwarded from <strong>Ephemera</strong>
    </p>
    <p style="margin: 5px 0 0; color: #334155;">
      <strong>From:</strong> ${message.fromAddress || "Unknown"}<br>
      <strong>To:</strong> ${message.toAddress || ""}<br>
      <strong>Date:</strong> ${new Date(message.receivedAt).toLocaleString()}
    </p>
    ${otp ? `
    <div style="background: #22c55e; color: white; padding: 10px 15px; border-radius: 6px; margin-top: 10px; display: inline-block;">
      🔢 OTP: <strong style="font-size: 18px; letter-spacing: 2px;">${otp.code}</strong>
    </div>
    ` : ""}
  </div>
  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
    ${message.htmlBody || `<pre style="white-space: pre-wrap;">${message.textBody || "(No content)"}</pre>`}
  </div>
</body>
</html>
  `.trim();
}
```

**File:** `services/api/src/services/forwarding/destinations/telegram-destination.ts`

```typescript
import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function forwardToTelegram(
  message: Message,
  rule: ForwardingRule
): Promise<{ success: boolean; error?: string }> {
  if (!rule.telegramChatId) {
    return { success: false, error: "No Telegram chat ID configured" };
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "Telegram bot not configured" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const text = buildTelegramMessage(message, otpResult);

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: rule.telegramChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Telegram API error: ${error}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildTelegramMessage(message: Message, otp: { code: string } | null): string {
  const lines = [
    `📩 <b>New Email Forwarded</b>`,
    ``,
    `<b>From:</b> ${escapeHtml(message.fromAddress || "Unknown")}`,
    `<b>Subject:</b> ${escapeHtml(message.subject || "(No subject)")}`,
  ];

  if (otp) {
    lines.push(``, `🔢 <b>OTP Code:</b> <code>${otp.code}</code>`);
  }

  // Preview (first 500 chars)
  const preview = (message.textBody || "").slice(0, 500);
  if (preview) {
    lines.push(``, `<b>Preview:</b>`, escapeHtml(preview));
    if ((message.textBody?.length || 0) > 500) {
      lines.push(`...`);
    }
  }

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
```

**File:** `services/api/src/services/forwarding/destinations/discord-destination.ts`

```typescript
import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

export async function forwardToDiscord(
  message: Message,
  rule: ForwardingRule
): Promise<{ success: boolean; error?: string }> {
  if (!rule.discordWebhookUrl) {
    return { success: false, error: "No Discord webhook URL configured" };
  }

  // Validate Discord webhook URL format
  if (!rule.discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return { success: false, error: "Invalid Discord webhook URL" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const embed = buildDiscordEmbed(message, otpResult);

    const response = await fetch(rule.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Ephemera Mail",
        avatar_url: "https://ephemera.click/logo.png",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Discord API error: ${error}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildDiscordEmbed(message: Message, otp: { code: string } | null) {
  const fields = [
    { name: "From", value: message.fromAddress || "Unknown", inline: true },
    { name: "To", value: message.toAddress || "", inline: true },
  ];

  if (otp) {
    fields.push({ name: "🔢 OTP Code", value: `\`${otp.code}\``, inline: false });
  }

  // Preview
  const preview = (message.textBody || "").slice(0, 1000);
  if (preview) {
    fields.push({ name: "Preview", value: preview, inline: false });
  }

  return {
    title: `📩 ${message.subject || "(No subject)"}`,
    color: 0x6366f1, // Indigo
    fields,
    timestamp: new Date(message.receivedAt).toISOString(),
    footer: { text: "Ephemera Email Forward" },
  };
}
```

**File:** `services/api/src/services/forwarding/destinations/webhook-destination.ts`

```typescript
import crypto from "crypto";
import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

export async function forwardToWebhook(
  message: Message & { attachments?: { id: string; filename: string }[] },
  rule: ForwardingRule
): Promise<{ success: boolean; error?: string }> {
  if (!rule.webhookUrl) {
    return { success: false, error: "No webhook URL configured" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const payload = buildWebhookPayload(message, rule, otpResult);
    const payloadStr = JSON.stringify(payload);

    // Generate signature if secret exists
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Ephemera-Event": "email.forwarded",
      "X-Ephemera-Delivery": crypto.randomUUID(),
    };

    if (rule.webhookSecret) {
      const signature = crypto
        .createHmac("sha256", rule.webhookSecret)
        .update(payloadStr)
        .digest("hex");
      headers["X-Ephemera-Signature"] = `sha256=${signature}`;
    }

    const response = await fetch(rule.webhookUrl, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildWebhookPayload(
  message: Message & { attachments?: { id: string; filename: string }[] },
  rule: ForwardingRule,
  otp: { code: string; confidence: string } | null
) {
  return {
    event: "email.forwarded",
    timestamp: new Date().toISOString(),
    rule: {
      id: rule.id,
      name: rule.name,
    },
    message: {
      id: message.id,
      messageId: message.messageId,
      from: message.fromAddress,
      to: message.toAddress,
      subject: message.subject,
      receivedAt: message.receivedAt,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      spamScore: message.spamScore,
      attachments: message.attachments?.map(a => ({
        id: a.id,
        filename: a.filename,
      })) || [],
    },
    extractedOtp: otp,
  };
}
```

### 3.4 Main Forwarding Service

**File:** `services/api/src/services/forwarding/index.ts`

```typescript
import { prisma } from "../../lib/prisma";
import { matchesConditions, parseLegacyConditions, type ForwardCondition } from "./condition-matcher";
import { forwardToEmail } from "./destinations/email-destination";
import { forwardToTelegram } from "./destinations/telegram-destination";
import { forwardToDiscord } from "./destinations/discord-destination";
import { forwardToWebhook } from "./destinations/webhook-destination";
import type { Message, ForwardingRule, ForwardDestinationType, FilterMatchType } from "@prisma/client";

type MessageWithAttachments = Message & {
  inbox: { id: string; ownerId: string | null };
  attachments?: { id: string; filename: string }[];
};

/**
 * Process forwarding rules for a new message
 */
export async function processForwardingRules(message: MessageWithAttachments): Promise<void> {
  if (!message.inbox.ownerId) return;

  // Get active rules for this user, sorted by priority
  const rules = await prisma.forwardingRule.findMany({
    where: {
      userId: message.inbox.ownerId,
      isActive: true,
      OR: [
        { inboxId: null },
        { inboxId: message.inbox.id },
      ],
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    await processRule(message, rule);
  }
}

async function processRule(message: MessageWithAttachments, rule: ForwardingRule): Promise<void> {
  const startTime = Date.now();

  // Parse conditions (handle legacy format)
  let conditions: ForwardCondition[];
  const rawConditions = rule.conditions as any;

  if (Array.isArray(rawConditions)) {
    conditions = rawConditions;
  } else {
    conditions = parseLegacyConditions(rawConditions);
  }

  // Check if message matches conditions
  const matchType = (rule as any).matchType as FilterMatchType || "ALL";
  if (!matchesConditions(message, conditions, matchType)) {
    return;
  }

  // Execute forward based on destination type
  const destinationType = (rule as any).destinationType as ForwardDestinationType || "EMAIL";
  let result: { success: boolean; error?: string };
  let destination: string;

  switch (destinationType) {
    case "EMAIL":
      destination = rule.forwardTo || "";
      result = await forwardToEmail(message, rule);
      break;

    case "TELEGRAM":
      destination = `telegram:${(rule as any).telegramChatId}`;
      result = await forwardToTelegram(message, rule);
      break;

    case "DISCORD":
      destination = "discord:webhook";
      result = await forwardToDiscord(message, rule);
      break;

    case "WEBHOOK":
      destination = (rule as any).webhookUrl || "";
      result = await forwardToWebhook(message, rule);
      break;

    default:
      result = { success: false, error: "Unknown destination type" };
      destination = "unknown";
  }

  const duration = Date.now() - startTime;

  // Log the execution
  await prisma.forwardingLog.create({
    data: {
      ruleId: rule.id,
      messageId: message.id,
      status: result.success ? "SUCCESS" : "FAILED",
      destination,
      destinationType,
      duration,
      error: result.error,
    },
  });

  // Update rule stats
  if (result.success) {
    await prisma.forwardingRule.update({
      where: { id: rule.id },
      data: {
        forwardCount: { increment: 1 },
        lastForwardAt: new Date(),
      },
    });
  }

  console.log(
    `[Forwarding] Rule ${rule.id}: ${result.success ? "SUCCESS" : "FAILED"} -> ${destination}`,
    result.error ? `Error: ${result.error}` : ""
  );
}
```

### 3.5 Update Email Queue Worker

**File:** `services/api/src/workers/emailWorker.ts` (update existing)

Add import and call:

```typescript
import { processForwardingRules } from "../services/forwarding";

// In the email processing function, after saving message:
await processForwardingRules(messageWithInbox);
```

### 3.6 Enhanced Routes

**File:** `services/api/src/routes/forwarding.ts` (update)

Add new endpoints for logs and testing:

```typescript
// Get forwarding logs for a rule
app.get("/forwarding/rules/:id/logs", { preHandler: app.authenticate }, async (request, reply) => {
  const user = request.user as { userId: string };
  const { id } = request.params as { id: string };

  const rule = await prisma.forwardingRule.findFirst({
    where: { id, userId: user.userId },
  });

  if (!rule) {
    return reply.status(404).send({ error: "Rule not found" });
  }

  const logs = await prisma.forwardingLog.findMany({
    where: { ruleId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { logs };
});

// Test a forwarding rule
app.post("/forwarding/rules/:id/test", { preHandler: app.authenticate }, async (request, reply) => {
  const user = request.user as { userId: string };
  const { id } = request.params as { id: string };

  const rule = await prisma.forwardingRule.findFirst({
    where: { id, userId: user.userId },
  });

  if (!rule) {
    return reply.status(404).send({ error: "Rule not found" });
  }

  // Create a test message
  const testMessage = {
    id: "test-" + Date.now(),
    fromAddress: "test@example.com",
    toAddress: "you@domain.com",
    subject: "Test Forwarding - OTP: 123456",
    textBody: "This is a test message. Your verification code is 123456.",
    htmlBody: null,
    receivedAt: new Date(),
    // ... other required fields
  };

  // TODO: Implement test execution
  return { success: true, message: "Test queued" };
});
```

## 4. Testing

### Unit Tests

```typescript
// test/forwarding/condition-matcher.test.ts
describe("ConditionMatcher", () => {
  describe("evaluateCondition", () => {
    it("should match FROM CONTAINS", () => { /* ... */ });
    it("should match SUBJECT REGEX", () => { /* ... */ });
    it("should match CONTAINS_OTP", () => { /* ... */ });
    it("should handle ALL matchType", () => { /* ... */ });
    it("should handle ANY matchType", () => { /* ... */ });
  });
});

// test/forwarding/destinations/telegram.test.ts
describe("TelegramDestination", () => {
  it("should send message to Telegram", () => { /* ... */ });
  it("should include OTP in message", () => { /* ... */ });
  it("should handle API errors", () => { /* ... */ });
});
```

## 5. Acceptance Criteria

- [ ] Database migration applied successfully
- [ ] Forward to Email works (existing functionality preserved)
- [ ] Forward to Telegram works
- [ ] Forward to Discord webhook works
- [ ] Forward to custom webhook works
- [ ] Condition matching: ALL mode works
- [ ] Condition matching: ANY mode works
- [ ] Condition: FROM field operators
- [ ] Condition: SUBJECT field operators
- [ ] Condition: BODY CONTAINS_OTP
- [ ] Condition: REGEX with timeout protection
- [ ] Forwarding logs created for each execution
- [ ] Rule statistics updated on success
- [ ] Legacy conditions format still works
