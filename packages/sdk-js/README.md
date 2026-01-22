# @ephemera/sdk

Official JavaScript/TypeScript SDK for the [Ephemera](https://ephemera.email) temporary email platform.

## Installation

```bash
npm install @ephemera/sdk
# or
yarn add @ephemera/sdk
# or
pnpm add @ephemera/sdk
```

## Quick Start

```typescript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient('your-api-key');

// Create a temporary inbox
const inbox = await client.createInbox();
console.log(`Created inbox: ${inbox.address}`);

// Wait for an email to arrive
const message = await client.waitForEmail(inbox.id, {
  subject: 'Verification',
  timeout: 60000
});

// Extract OTP code
const code = client.extractCode(message);
console.log(`Verification code: ${code}`);

// Clean up
await client.deleteInbox(inbox.id);
```

## Configuration

```typescript
// Simple: just API key
const client = new EphemeraClient('your-api-key');

// Advanced: full configuration
const client = new EphemeraClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.manhquy.click', // optional
  timeout: 30000 // optional, in ms
});
```

## API Reference

### Inbox Methods

```typescript
// Create inbox
const inbox = await client.createInbox();
const inbox = await client.createInbox({ localPart: 'test', domainId: '...' });
const inbox = await client.createInbox({ expiresIn: 3600000 }); // 1 hour

// Get inbox
const inbox = await client.getInbox('inbox-id');

// List inboxes
const inboxes = await client.listInboxes();

// Delete inbox
await client.deleteInbox('inbox-id');

// Extend expiration
await client.extendInbox('inbox-id', 600000); // +10 minutes
```

### Message Methods

```typescript
// Get messages
const messages = await client.getMessages('inbox-id');
const messages = await client.getMessages('inbox-id', {
  q: 'verification',
  from: 'noreply@example.com',
  unreadOnly: true,
  limit: 10
});

// Get single message
const message = await client.getMessage('message-id');

// Delete message
await client.deleteMessage('message-id');

// Mark as read/unread
await client.markAsRead('message-id');
await client.markAsUnread('message-id');
```

### Convenience Methods

```typescript
// Wait for email (polling)
const message = await client.waitForEmail('inbox-id', {
  subject: 'Welcome',    // optional: match subject
  from: 'noreply@',      // optional: match sender
  timeout: 60000,        // optional: max wait time (default: 60s)
  interval: 2000         // optional: poll interval (default: 2s)
});

// Extract OTP/verification code
const code = client.extractCode(message);

// Create inbox and wait for email (common pattern)
const { inbox, message } = await client.createInboxAndWait(
  { expiresIn: 300000 },           // inbox options
  { subject: 'Verification' }       // wait options
);
```

### Bulk Operations

```typescript
// Create multiple inboxes
const result = await client.bulkCreateInboxes({
  inboxes: [
    { localPart: 'test1' },
    { localPart: 'test2' },
    { localPart: 'test3' }
  ]
});
console.log(result.success); // successfully created
console.log(result.failed);  // failed creations

// Delete multiple inboxes
await client.bulkDeleteInboxes({
  ids: ['inbox-1', 'inbox-2', 'inbox-3']
});
```

## Error Handling

```typescript
import { EphemeraError, RateLimitedError, NotFoundError } from '@ephemera/sdk';

try {
  const inbox = await client.getInbox('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Inbox not found');
  } else if (error instanceof RateLimitedError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
  } else if (error instanceof EphemeraError) {
    console.log(`API error: ${error.code} - ${error.message}`);
  }
}
```

## Testing Example

```typescript
import { EphemeraClient } from '@ephemera/sdk';
import { test, expect } from 'vitest';

test('user registration flow', async () => {
  const client = new EphemeraClient(process.env.EPHEMERA_API_KEY!);

  // Create temp inbox
  const inbox = await client.createInbox();

  // Register user with temp email
  await registerUser({ email: inbox.address, password: 'test123' });

  // Wait for verification email
  const message = await client.waitForEmail(inbox.id, {
    subject: 'Verify your email',
    timeout: 30000
  });

  // Extract and use verification code
  const code = client.extractCode(message);
  expect(code).toBeTruthy();

  await verifyEmail({ email: inbox.address, code: code! });

  // Cleanup
  await client.deleteInbox(inbox.id);
});
```

## Privacy

Ephemera is built with privacy-first principles:
- Zero-log policy: No original IPs stored
- Tracking pixels automatically removed
- Sensitive headers filtered
- Open source for transparency

## License

MIT
