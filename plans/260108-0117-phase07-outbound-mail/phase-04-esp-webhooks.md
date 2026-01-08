# Phase 04: ESP Webhook Receivers

**Status:** planned
**Effort:** 4h
**Dependencies:** Phase 01 (Database Schema)
**Owner:** Backend

## Objective

Implement webhook receivers for SES, Mailgun, and SendGrid to handle bounces, complaints, and delivery confirmations.

## Webhook Flow

```
ESP Webhook Request
       |
       v
  Signature Verification
       |
       v
  Parse Event Type
       |
       +-- bounce --> Update OutboundMessage (BOUNCED)
       |                  |
       |                  v
       |              Add to BounceSuppressionList (Phase 05)
       |
       +-- complaint --> Update OutboundMessage (COMPLAINED)
       |                     |
       |                     v
       |                 Add to BounceSuppressionList
       |
       +-- delivery --> Update OutboundMessage (DELIVERED)
```

## Implementation

### 1. ESP Webhook Routes (`routes/esp-webhooks.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { verifySesSignature } from '../utils/esp-parsers/ses';
import { verifyMailgunSignature } from '../utils/esp-parsers/mailgun';
import { verifySendgridSignature } from '../utils/esp-parsers/sendgrid';
import { processEspEvent } from '../services/esp-event.service';

export async function espWebhookRoutes(app: FastifyInstance) {
  // AWS SES via SNS
  app.post('/webhooks/ses', async (request, reply) => {
    const body = request.body as any;

    // Handle SNS subscription confirmation
    if (body.Type === 'SubscriptionConfirmation') {
      await fetch(body.SubscribeURL);
      return { ok: true, action: 'subscribed' };
    }

    // Verify SNS signature
    if (!await verifySesSignature(body)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Parse notification
    const message = JSON.parse(body.Message);
    await processEspEvent('ses', message);

    return { ok: true };
  });

  // Mailgun
  app.post('/webhooks/mailgun', async (request, reply) => {
    const body = request.body as any;
    const signature = body.signature;

    if (!verifyMailgunSignature(signature)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    await processEspEvent('mailgun', body['event-data']);

    return { ok: true };
  });

  // SendGrid
  app.post('/webhooks/sendgrid', async (request, reply) => {
    const signature = request.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'] as string;

    if (!verifySendgridSignature(signature, timestamp, request.rawBody)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const events = request.body as any[];
    for (const event of events) {
      await processEspEvent('sendgrid', event);
    }

    return { ok: true };
  });
}
```

### 2. SES Parser (`utils/esp-parsers/ses.ts`)

```typescript
import crypto from 'crypto';

export async function verifySesSignature(body: any): Promise<boolean> {
  // Verify SNS message signature
  // https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
  const certUrl = body.SigningCertURL;

  // Validate cert URL is from AWS
  if (!certUrl?.startsWith('https://sns.') || !certUrl.includes('.amazonaws.com/')) {
    return false;
  }

  const cert = await fetch(certUrl).then(r => r.text());
  const verify = crypto.createVerify('SHA1withRSA');

  // Build signature string based on message type
  const stringToSign = buildSnsStringToSign(body);
  verify.update(stringToSign);

  return verify.verify(cert, body.Signature, 'base64');
}

export function parseSesEvent(message: any): EspEvent {
  const { eventType, mail, bounce, complaint, delivery } = message;

  switch (eventType) {
    case 'Bounce':
      return {
        type: 'bounce',
        messageId: mail.messageId,
        recipient: bounce.bouncedRecipients[0].emailAddress,
        bounceType: bounce.bounceType === 'Permanent' ? 'HARD' : 'SOFT',
        bounceSubType: bounce.bounceSubType,
        timestamp: new Date(bounce.timestamp),
      };
    case 'Complaint':
      return {
        type: 'complaint',
        messageId: mail.messageId,
        recipient: complaint.complainedRecipients[0].emailAddress,
        complaintType: complaint.complaintFeedbackType,
        timestamp: new Date(complaint.timestamp),
      };
    case 'Delivery':
      return {
        type: 'delivery',
        messageId: mail.messageId,
        recipient: delivery.recipients[0],
        timestamp: new Date(delivery.timestamp),
      };
    default:
      return { type: 'unknown', messageId: mail?.messageId };
  }
}
```

### 3. Mailgun Parser (`utils/esp-parsers/mailgun.ts`)

```typescript
import crypto from 'crypto';
import { appConfig } from '../../config';

export function verifyMailgunSignature(signature: {
  timestamp: string;
  token: string;
  signature: string;
}): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return false;

  const encoded = crypto
    .createHmac('sha256', signingKey)
    .update(signature.timestamp + signature.token)
    .digest('hex');

  return encoded === signature.signature;
}

export function parseMailgunEvent(eventData: any): EspEvent {
  const event = eventData.event;
  const messageId = eventData['message-headers']?.find(
    (h: any) => h[0] === 'Message-Id'
  )?.[1];

  switch (event) {
    case 'failed':
      const severity = eventData.severity;
      return {
        type: 'bounce',
        messageId,
        recipient: eventData.recipient,
        bounceType: severity === 'permanent' ? 'HARD' : 'SOFT',
        bounceSubType: eventData['delivery-status']?.code,
        bounceMessage: eventData['delivery-status']?.message,
        timestamp: new Date(eventData.timestamp * 1000),
      };
    case 'complained':
      return {
        type: 'complaint',
        messageId,
        recipient: eventData.recipient,
        timestamp: new Date(eventData.timestamp * 1000),
      };
    case 'delivered':
      return {
        type: 'delivery',
        messageId,
        recipient: eventData.recipient,
        timestamp: new Date(eventData.timestamp * 1000),
      };
    default:
      return { type: 'unknown', messageId };
  }
}
```

### 4. SendGrid Parser (`utils/esp-parsers/sendgrid.ts`)

```typescript
import crypto from 'crypto';

export function verifySendgridSignature(
  signature: string,
  timestamp: string,
  rawBody: Buffer | string
): boolean {
  const webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET;
  if (!webhookSecret || !signature || !timestamp) return false;

  const payload = timestamp + rawBody.toString();
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export function parseSendgridEvent(event: any): EspEvent {
  const messageId = event.sg_message_id?.split('.')[0]; // Strip suffix

  switch (event.event) {
    case 'bounce':
      return {
        type: 'bounce',
        messageId,
        recipient: event.email,
        bounceType: event.type === 'bounce' ? 'HARD' : 'SOFT',
        bounceSubType: event.reason,
        timestamp: new Date(event.timestamp * 1000),
      };
    case 'spamreport':
      return {
        type: 'complaint',
        messageId,
        recipient: event.email,
        timestamp: new Date(event.timestamp * 1000),
      };
    case 'delivered':
      return {
        type: 'delivery',
        messageId,
        recipient: event.email,
        timestamp: new Date(event.timestamp * 1000),
      };
    default:
      return { type: 'unknown', messageId };
  }
}
```

### 5. ESP Event Service (`services/esp-event.service.ts`)

```typescript
import { prisma } from '../lib/prisma';
import { parseSesEvent } from '../utils/esp-parsers/ses';
import { parseMailgunEvent } from '../utils/esp-parsers/mailgun';
import { parseSendgridEvent } from '../utils/esp-parsers/sendgrid';

export async function processEspEvent(provider: string, rawEvent: any) {
  // Parse event based on provider
  let event: EspEvent;
  switch (provider) {
    case 'ses':
      event = parseSesEvent(rawEvent);
      break;
    case 'mailgun':
      event = parseMailgunEvent(rawEvent);
      break;
    case 'sendgrid':
      event = parseSendgridEvent(rawEvent);
      break;
    default:
      return;
  }

  if (event.type === 'unknown') return;

  // Find OutboundMessage by espMessageId or messageId
  const outboundMessage = await prisma.outboundMessage.findFirst({
    where: {
      OR: [
        { espMessageId: event.messageId },
        { messageId: { contains: event.messageId } },
      ],
    },
  });

  if (!outboundMessage) {
    console.warn(`[ESP] No OutboundMessage found for messageId: ${event.messageId}`);
    return;
  }

  // Update based on event type
  switch (event.type) {
    case 'bounce':
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'BOUNCED',
          bouncedAt: event.timestamp,
          bounceType: event.bounceType,
          bounceSubType: event.bounceSubType,
          bounceMessage: event.bounceMessage,
        },
      });

      // Add to suppression list (hard bounces only)
      if (event.bounceType === 'HARD') {
        await addToSuppressionList(event.recipient, 'hard_bounce', outboundMessage.id);
      }
      break;

    case 'complaint':
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'COMPLAINED',
          complaintType: event.complaintType,
        },
      });

      // Always suppress complaints
      await addToSuppressionList(event.recipient, 'complaint', outboundMessage.id);
      break;

    case 'delivery':
      await prisma.outboundMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: event.timestamp,
        },
      });
      break;
  }
}

async function addToSuppressionList(email: string, reason: string, sourceId: string) {
  await prisma.bounceSuppressionList.upsert({
    where: { email },
    create: { email, reason, sourceId },
    update: { reason, sourceId },
  });
}
```

## Environment Variables

```bash
# SES
SES_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:...

# Mailgun
MAILGUN_WEBHOOK_SIGNING_KEY=key-xxx

# SendGrid
SENDGRID_WEBHOOK_SECRET=SG.xxx
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `routes/esp-webhooks.ts` | Create |
| `utils/esp-parsers/ses.ts` | Create |
| `utils/esp-parsers/mailgun.ts` | Create |
| `utils/esp-parsers/sendgrid.ts` | Create |
| `services/esp-event.service.ts` | Create |
| `index.ts` | Modify - register webhook routes |

## Acceptance Criteria

- [ ] SES SNS webhook receives and verifies signatures
- [ ] Mailgun webhook receives and verifies HMAC
- [ ] SendGrid webhook receives and verifies signature
- [ ] Bounces update OutboundMessage to BOUNCED
- [ ] Complaints update OutboundMessage to COMPLAINED
- [ ] Deliveries update OutboundMessage to DELIVERED
- [ ] Hard bounces added to suppression list
- [ ] Complaints added to suppression list
- [ ] Invalid signatures return 401

## Webhook Registration

### SES Setup

1. Create SNS Topic in AWS Console
2. Add HTTPS subscription to `/webhooks/ses`
3. Configure SES to publish to SNS Topic
4. Confirm subscription (handled automatically in code)

### Mailgun Setup

1. Go to Webhooks in Mailgun Dashboard
2. Add webhook URLs for: bounced, complained, delivered
3. Copy Signing Key to `MAILGUN_WEBHOOK_SIGNING_KEY`

### SendGrid Setup

1. Go to Settings > Mail Settings > Event Webhook
2. Set HTTP Post URL to `/webhooks/sendgrid`
3. Enable: Bounce, Spam Report, Delivered
4. Copy Verification Key to `SENDGRID_WEBHOOK_SECRET`

## Notes

- All webhooks are idempotent (safe to replay)
- Message ID lookup uses OR condition for flexibility
- Soft bounces do NOT add to suppression (temporary issues)
- Raw body required for SendGrid signature verification
