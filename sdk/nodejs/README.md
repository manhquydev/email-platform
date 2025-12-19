# TempMail Pro Node.js SDK

Official Node.js SDK for the TempMail Pro API.

## Installation

```bash
npm install @tempmailpro/sdk
# or
yarn add @tempmailpro/sdk
```

## Quick Start

```typescript
import TempMailPro from '@tempmailpro/sdk';

// Initialize the client
const client = new TempMailPro({
  apiKey: process.env.TEMPMAILPRO_API_KEY,
  // or use config object
  // apiKey: 'your-api-key',
  // baseURL: 'https://api.tempmail.pro/v1',
  // timeout: 30000,
});

async function example() {
  try {
    // Create an inbox
    const inbox = await client.createInbox({
      description: 'My test inbox'
    });
    console.log('Created inbox:', inbox.address);

    // List messages
    const { messages } = await client.listMessages(inbox.id);
    console.log('Messages:', messages.length);

    // Create an API key
    const { apiKey, key } = await client.createApiKey('My API Key', {
      permissions: ['read', 'write']
    });
    console.log('API Key created:', apiKey);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

## Configuration

The SDK can be configured using environment variables or by passing a config object:

### Environment Variables

```bash
TEMPMAILPRO_API_KEY=your-api-key
TEMPMAILPRO_BASE_URL=https://api.tempmail.pro/v1
TEMPMAILPRO_TIMEOUT=30000
TEMPMAILPRO_RETRIES=3
```

### Config Object

```typescript
const client = new TempMailPro({
  apiKey: 'your-api-key',
  baseURL: 'https://api.tempmail.pro/v1',
  timeout: 30000,
  retries: 3
});
```

## API Reference

### Users

```typescript
// Get current user
const user = await client.getCurrentUser();
```

### Domains

```typescript
// List domains
const { domains, meta } = await client.listDomains({
  limit: 10,
  offset: 0,
  search: 'example.com'
});

// Create a domain
const domain = await client.createDomain('example.com');

// Verify domain
const verifiedDomain = await client.verifyDomain(domain.id, 'verification-token');

// Delete domain
await client.deleteDomain(domain.id);
```

### Inboxes

```typescript
// List inboxes
const { inboxes, meta } = await client.listInboxes({
  limit: 10,
  search: 'test'
});

// Create an inbox
const inbox = await client.createInbox({
  domain: 'example.com',
  description: 'Test inbox',
  autoDelete: true,
  autoDeleteHours: 24
});

// Get inbox details
const inbox = await client.getInbox(inboxId);

// Delete inbox
await client.deleteInbox(inboxId);
```

### Messages

```typescript
// List messages in an inbox
const { messages, meta } = await client.listMessages(inboxId, {
  limit: 50,
  sortBy: 'receivedAt',
  sortOrder: 'desc'
});

// Get message
const message = await client.getMessage(messageId);

// Mark as read
await client.markMessageAsRead(messageId);

// Delete message
await client.deleteMessage(messageId);
```

### Attachments

```typescript
// List attachments
const attachments = await client.listAttachments(messageId);

// Get attachment URL
const { url, filename } = await client.getAttachment(attachmentId);

// Download attachment
const buffer = await client.downloadAttachment(attachmentId);
```

### Filter Rules

```typescript
// List filter rules
const rules = await client.listFilterRules();

// Create a filter rule
const rule = await client.createFilterRule({
  name: 'Block spam',
  type: 'BLOCK',
  field: 'FROM',
  pattern: '*@spam.com',
  priority: 100
});

// Update filter rule
const updatedRule = await client.updateFilterRule(ruleId, {
  isActive: false
});

// Delete filter rule
await client.deleteFilterRule(ruleId);
```

### API Keys

```typescript
// List API keys
const apiKeys = await client.listApiKeys();

// Create API key
const { apiKey, key } = await client.createApiKey('My Key', {
  permissions: ['read', 'write'],
  organizationId: 'org-id',
  rateLimit: 1000
});

// Delete API key
await client.deleteApiKey(keyId);
```

### Webhooks

```typescript
// List webhooks
const webhooks = await client.listWebhooks();

// Create webhook
const { webhook, secret } = await client.createWebhook(
  'My Webhook',
  'https://example.com/webhook',
  ['email.received', 'email.bounced'],
  {
    secret: 'webhook-secret',
    timeout: 30000,
    retryAttempts: 3
  }
);

// Delete webhook
await client.deleteWebhook(webhookId);
```

### Usage and Quotas

```typescript
// Get usage statistics
const usage = await client.getUsage();
console.log('Emails this month:', usage.emailsThisMonth);

// Get quota limits
const limits = await client.getQuotaLimits();
console.log('Max inboxes:', limits.inboxes);
```

## Error Handling

The SDK throws errors for API failures:

```typescript
try {
  const inbox = await client.createInbox();
} catch (error) {
  if (error.message.includes('401')) {
    console.log('Invalid API key');
  } else if (error.message.includes('429')) {
    console.log('Rate limit exceeded');
  } else {
    console.log('Error:', error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import TempMailPro, { Inbox, Message, ApiKey } from '@tempmailpro/sdk';

const client = new TempMailPro({ apiKey: 'your-key' });

const inbox: Inbox = await client.createInbox();
const message: Message = await client.getMessage(messageId);
const apiKeys: ApiKey[] = await client.listApiKeys();
```

## License

MIT License - see [LICENSE](LICENSE) file for details.