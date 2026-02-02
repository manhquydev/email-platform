# Backend Architecture Research: Robust Outbound Email Service

## 1. Architecture: Adapter/Strategy Pattern

To support multiple email providers (AWS SES, Mailgun, SendGrid, SMTP) and switch between them easily (or failover), we should implement the **Strategy Pattern**.

### Core Components

1.  **`EmailProvider` Interface**: Defines the contract that all providers must adhere to.
2.  **`MailerService` (Context)**: The high-level service used by the application. It manages the active provider strategy and handles queueing.
3.  **Concrete Strategies**: Implementations for each provider (e.g., `SesProvider`, `SmtpProvider`, `SendGridProvider`).

### Interface Definition

```typescript
// types/email-provider.ts

export interface EmailMessage {
  to: string | string[];
  from: string; // "Name <email@domain.com>"
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  metadata?: Record<string, string>; // For tagging/tracking (e.g. tenantId)
}

export interface EmailResult {
  id: string; // Provider's message ID
  provider: string; // 'ses', 'sendgrid', 'smtp'
  status: 'queued' | 'sent' | 'failed';
}

export interface IEmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
  verifyConnection?(): Promise<boolean>;
}
```

### Implementation Example

The `MailerService` should not contain provider-specific logic. It should instantiate the correct provider based on configuration.

```typescript
// services/mailer/mailer.service.ts
export class MailerService {
  private provider: IEmailProvider;

  constructor(config: AppConfig) {
    switch (config.email.provider) {
      case 'ses':
        this.provider = new SesProvider(config.aws);
        break;
      case 'sendgrid':
        this.provider = new SendGridProvider(config.sendgrid);
        break;
      case 'smtp':
      default:
        this.provider = new SmtpProvider(config.smtp);
        break;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // 1. Validation
    // 2. Queueing (see Section 4)
    // 3. Or direct send
    return this.provider.send(message);
  }
}
```

## 2. Deliverability & DKIM

### Programmatic DKIM (Nodemailer/SMTP)
The current codebase already uses `nodemailer` which supports DKIM signing natively. This is crucial when using **Generic SMTP** or **AWS SES (via SMTP interface)** where you want to control the signing key yourself (BYODKIM).

**Best Practice:**
- **Storage**: Store private keys encrypted in the database (as currently implemented).
- **Selector**: Use a standardized selector (e.g., `ephemera2026`).
- **Canonicalization**: Use `relaxed/relaxed` for better tolerance of modifications by forwarding servers.

```typescript
// Within SmtpProvider (using nodemailer)
const transporter = nodemailer.createTransport({
  // ... config
  dkim: {
    domainName: 'example.com',
    keySelector: 'default',
    privateKey: '-----BEGIN PRIVATE KEY-----...'
  }
});
```

### API-Based DKIM (SendGrid/SES API)
When using HTTP APIs (not SMTP), these providers typically handle DKIM signing automatically based on domain verification records (CNAME) you add to your DNS.
- **Action**: The application normally *does not* need to sign the raw MIME when using HTTP APIs unless the provider supports "Bring Your Own DKIM" via raw MIME upload.
- **Recommendation**: Rely on the provider's DNS-based DKIM verification for HTTP APIs to reduce complexity. Use programmatic signing only for the SMTP strategy.

## 3. Events: Standardizing Webhooks

Different providers send different JSON payloads for events (Bounce, Complaint, Delivery). We need a **Normalization Layer**.

### Standardized Event Structure

```typescript
export type EmailEventType = 'delivered' | 'bounce' | 'complaint' | 'open' | 'click';

export interface NormalizedEmailEvent {
  messageId: string;      // The ID returned during sending
  provider: string;       // 'ses', 'sendgrid'
  eventType: EmailEventType;
  recipient: string;
  timestamp: Date;
  meta: {
    bounceType?: 'hard' | 'soft';
    bounceReason?: string;
    userAgent?: string;
    ip?: string;
  };
}
```

### Webhook Handling Flow

1.  **Endpoint**: Expose `/api/webhooks/email/{provider}` (e.g., `/api/webhooks/email/sendgrid`).
2.  **Verification**: Verify the webhook signature (HMAC) to ensure it's from the provider.
3.  **Normalization**: Map provider-specific status to `NormalizedEmailEvent`.
    - **SendGrid**: `processed`, `dropped`, `delivered`, `deferred`, `bounce`.
    - **SES**: `Bounce`, `Complaint`, `Delivery`.
    - **Mailgun**: `delivered`, `bounced`, `complained`.
4.  **Processing**: Update email logs in DB, trigger user notifications, or decrement reputation scores.

## 4. Queuing with BullMQ

Sending emails is an I/O heavy operation and can fail/timeout. It **must** be asynchronous to avoid blocking the Fastify API.

### Architecture
Since `bullmq` is already in `package.json`, we should leverage it.

1.  **Producer (`MailerService`)**:
    Instead of calling `provider.send()` directly, it adds a job to the queue.

    ```typescript
    import { Queue } from 'bullmq';

    const emailQueue = new Queue('outbound-email', { connection: redisConfig });

    // In MailerService
    async sendEmailAsync(message: EmailMessage) {
      await emailQueue.add('send-email', message, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      });
    }
    ```

2.  **Consumer (Worker)**:
    A dedicated worker processes the jobs.

    ```typescript
    import { Worker } from 'bullmq';

    const emailWorker = new Worker('outbound-email', async (job) => {
      const { provider } = getProviderStrategy(); // Or pass via job data
      await provider.send(job.data);
    }, { connection: redisConfig });
    ```

### Recommended Flow
1.  **API Request**: User triggers action (e.g., "Reset Password").
2.  **Queue**: `MailerService` validates input and pushes job to Redis (`BullMQ`). Returns `202 Accepted` to UI.
3.  **Worker**: Picks up job, selects `EmailProvider`, sends email.
4.  **Result**:
    - **Success**: Log to DB `EmailLog` table with `status: 'sent'` and `providerMessageId`.
    - **Fail**: BullMQ retries automatically. If final fail, log `status: 'failed'`.

## Summary of Recommendations

1.  **Refactor `OutboundService`**: Move away from the single class approach to an interface-based `EmailProvider` strategy.
2.  **Implement BullMQ**: Move the actual `nodemailer`/API calls into a background worker.
3.  **Webhook Ingestion**: Create a specific service (`EmailEventService`) to normalize incoming webhooks from providers, separate from the existing tenant webhook service.
4.  **DKIM**: Continue using `nodemailer`'s DKIM signing for SMTP, but rely on DNS validation for HTTP API providers.
