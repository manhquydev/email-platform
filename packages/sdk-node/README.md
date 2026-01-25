# @ephemera/sdk

Official Node.js SDK for [Ephemera](https://ephemera.email) - Privacy-first temporary email API.

## Installation

```bash
npm install @ephemera/sdk
```

## Quick Start

```typescript
import { Ephemera } from '@ephemera/sdk';

const client = new Ephemera('eph_live_xxx');

// Create inbox
const inbox = await client.inboxes.create();
console.log(`Email: ${inbox.email}`);

// Get messages
const { data: messages } = await client.inboxes.messages(inbox.id);

// Extract OTP from message
const otp = await client.messages.extractOtp(messages[0].id);
if (otp.found) {
  console.log(`Code: ${otp.otp.code}`);
}

// Full message analysis (OTP + category + phishing)
const analysis = await client.messages.analyze(messages[0].id);
```

## API Reference

### Inboxes

- `client.inboxes.create(options?)` - Create new inbox
- `client.inboxes.get(id)` - Get inbox details
- `client.inboxes.delete(id)` - Delete inbox
- `client.inboxes.messages(id, options?)` - List messages

### Messages

- `client.messages.get(id)` - Get full message
- `client.messages.extractOtp(id)` - Extract verification code
- `client.messages.analyze(id)` - Full analysis (OTP, category, phishing)

### Usage

- `client.usage()` - Get API usage stats

## License

MIT
