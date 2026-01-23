---
sidebar_position: 1
slug: /getting-started
---

# Introduction

Ephemera is a temporary email platform designed for developers. Create disposable inboxes, receive emails, and extract verification codes - all through a simple API.

## Use Cases

- **E2E Testing**: Automate signup flows with Playwright, Cypress, or Selenium
- **QA Automation**: Test email notifications without real addresses
- **CI/CD Pipelines**: Validate email functionality in automated tests
- **Development**: Debug email templates and flows locally

## Key Features

| Feature | Description |
|---------|-------------|
| Disposable Inboxes | Create temporary addresses on-demand |
| OTP Extraction | Automatically extract verification codes |
| Webhooks | Real-time notifications when emails arrive |
| 7 SDKs | JavaScript, Python, Go, PHP, Java, .NET, CLI |
| Custom Domains | Use your own domain for inboxes |

## Quick Example

```javascript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient('your-api-key');

// Create inbox, wait for email, extract code
const inbox = await client.createInbox();
const message = await client.waitForEmail(inbox.id, { subject: 'Verify' });
const code = client.extractCode(message);

console.log(`OTP: ${code}`);
```

## Next Steps

- [Authentication](./authentication) - Get your API key
- [Quick Start](./quickstart) - Complete tutorial
- [API Reference](/docs/api-reference/overview) - Full API documentation
