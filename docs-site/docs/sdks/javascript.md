---
sidebar_position: 1
---

# JavaScript SDK

Official JavaScript/TypeScript SDK for Ephemera.

## Installation

```bash
npm install @ephemera/sdk
```

## Quick Start

```javascript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient(process.env.EPHEMERA_API_KEY);

// Create inbox
const inbox = await client.createInbox();

// Wait for email and extract code
const message = await client.waitForEmail(inbox.id, { subject: 'Verify' });
const code = client.extractCode(message);
```

## API Reference

### Constructor

```typescript
new EphemeraClient(apiKey: string, options?: ClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| baseUrl | string | https://api.manhquy.id.vn/v1 | API base URL |
| timeout | number | 30000 | Request timeout (ms) |

### Methods

| Method | Description |
|--------|-------------|
| `createInbox(options?)` | Create temporary inbox |
| `getInbox(id)` | Get inbox details |
| `deleteInbox(id)` | Delete inbox |
| `getMessages(inboxId)` | List messages in inbox |
| `getMessage(id)` | Get message details |
| `waitForEmail(inboxId, options)` | Poll until email arrives |
| `extractCode(message)` | Extract OTP from message |

### Webhook Verification

```javascript
import { SignatureVerifier } from '@ephemera/sdk';

const isValid = SignatureVerifier.verify(
  payload,
  signature,
  secret,
  timestamp
);
```
