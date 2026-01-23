# Ephemera SDK Guide

Comprehensive guide for integrating Ephemera API using official SDKs.

## Available SDKs

| Language | Package | Install |
|----------|---------|---------|
| JavaScript/TypeScript | `@ephemera/sdk` | `npm install @ephemera/sdk` |
| Python | `ephemera` | `pip install ephemera` |
| Go | `github.com/ephemera/sdk-go` | `go get github.com/ephemera/sdk-go` |
| PHP | `ephemera/sdk` | `composer require ephemera/sdk` |
| Java | `com.ephemera:sdk` | Maven dependency |
| .NET | `Ephemera.Sdk` | `dotnet add package Ephemera.Sdk` |
| CLI | `@ephemera/cli` | `npm install -g @ephemera/cli` |

---

## JavaScript/TypeScript SDK

### Installation

```bash
npm install @ephemera/sdk
```

### Quick Start

```typescript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient(process.env.EPHEMERA_API_KEY);

// Create inbox
const inbox = await client.createInbox();
console.log(`Email: ${inbox.address}`);

// Wait for verification email
const message = await client.waitForEmail(inbox.id, {
  subject: 'Verification',
  timeout: 60000
});

// Extract OTP code
const code = client.extractCode(message);
console.log(`OTP: ${code}`);

// Cleanup
await client.deleteInbox(inbox.id);
```

### Methods

| Method | Description |
|--------|-------------|
| `createInbox(options?)` | Create temporary inbox |
| `getInbox(id)` | Get inbox details |
| `deleteInbox(id)` | Delete inbox |
| `getMessages(inboxId, limit?)` | List messages |
| `getMessage(id)` | Get message details |
| `waitForEmail(inboxId, options)` | Poll until email arrives |
| `extractCode(message)` | Extract OTP from message |

### Webhook Verification

```typescript
import { SignatureVerifier } from '@ephemera/sdk';

const isValid = SignatureVerifier.verify(
  payload,
  signature,
  secret,
  timestamp
);
```

---

## Python SDK

### Installation

```bash
pip install ephemera
```

### Quick Start

```python
from ephemera import EphemeraClient
import os

client = EphemeraClient(os.environ["EPHEMERA_API_KEY"])

# Create inbox
inbox = client.create_inbox()
print(f"Email: {inbox.address}")

# Wait for verification email
message = client.wait_for_email(inbox.id, subject="Verification")

# Extract OTP code
code = client.extract_code(message)
print(f"OTP: {code}")

# Cleanup
client.delete_inbox(inbox.id)
```

### Methods

| Method | Description |
|--------|-------------|
| `create_inbox(domain=None, expires_in=3600)` | Create inbox |
| `get_inbox(inbox_id)` | Get inbox details |
| `delete_inbox(inbox_id)` | Delete inbox |
| `get_messages(inbox_id, limit=20)` | List messages |
| `wait_for_email(inbox_id, subject=None, timeout=60)` | Poll for email |
| `extract_code(message)` | Extract OTP code |

### Webhook Verification

```python
from ephemera.webhook import SignatureVerifier

is_valid = SignatureVerifier.verify(
    payload=request.body,
    signature=request.headers["X-Ephemera-Signature"],
    secret=os.environ["WEBHOOK_SECRET"],
    timestamp=int(request.headers["X-Ephemera-Timestamp"])
)
```

---

## Go SDK

### Installation

```bash
go get github.com/ephemera/sdk-go
```

### Quick Start

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    "github.com/ephemera/sdk-go/ephemera"
)

func main() {
    client := ephemera.NewClient(os.Getenv("EPHEMERA_API_KEY"))
    ctx := context.Background()

    // Create inbox
    inbox, _ := client.CreateInbox(ctx, nil)
    fmt.Printf("Email: %s\n", inbox.Address)

    // Wait for verification email
    message, _ := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitOptions{
        Subject: "Verification",
        Timeout: 60 * time.Second,
    })

    // Extract OTP code
    code := ephemera.ExtractCode(message)
    fmt.Printf("OTP: %s\n", code)

    // Cleanup
    client.DeleteInbox(ctx, inbox.ID)
}
```

---

## PHP SDK

### Installation

```bash
composer require ephemera/sdk
```

### Quick Start

```php
<?php
use Ephemera\EphemeraClient;

$client = new EphemeraClient($_ENV['EPHEMERA_API_KEY']);

// Create inbox
$inbox = $client->createInbox();
echo "Email: " . $inbox->address . "\n";

// Wait for verification email
$message = $client->waitForEmail($inbox->id, subject: 'Verification');

// Extract OTP code
$code = $client->extractCode($message);
echo "OTP: " . $code . "\n";

// Cleanup
$client->deleteInbox($inbox->id);
```

### Laravel Integration

```php
// config/ephemera.php is auto-published
// Set EPHEMERA_API_KEY in .env

$inbox = app(EphemeraClient::class)->createInbox();
```

---

## Java SDK

### Installation (Maven)

```xml
<dependency>
    <groupId>com.ephemera</groupId>
    <artifactId>sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Quick Start

```java
import com.ephemera.sdk.EphemeraClient;
import java.time.Duration;

var client = new EphemeraClient(System.getenv("EPHEMERA_API_KEY"));

// Create inbox
var inbox = client.createInbox();
System.out.println("Email: " + inbox.getAddress());

// Wait for verification email
var message = client.waitForEmail(
    inbox.getId(),
    "Verification",
    null,
    Duration.ofSeconds(60)
);

// Extract OTP code
var code = client.extractCode(message);
System.out.println("OTP: " + code);

// Cleanup
client.deleteInbox(inbox.getId());
```

---

## .NET SDK

### Installation

```bash
dotnet add package Ephemera.Sdk
```

### Quick Start

```csharp
using Ephemera.Sdk;

using var client = new EphemeraClient(
    Environment.GetEnvironmentVariable("EPHEMERA_API_KEY")!
);

// Create inbox
var inbox = await client.CreateInboxAsync();
Console.WriteLine($"Email: {inbox.Address}");

// Wait for verification email
var message = await client.WaitForEmailAsync(
    inbox.Id,
    subject: "Verification"
);

// Extract OTP code
var code = client.ExtractCode(message);
Console.WriteLine($"OTP: {code}");

// Cleanup
await client.DeleteInboxAsync(inbox.Id);
```

---

## CLI

### Installation

```bash
npm install -g @ephemera/cli
```

### Configuration

```bash
ephemera config set api-key YOUR_API_KEY
```

### Commands

```bash
# Create inbox
ephemera inbox create

# List messages
ephemera messages list <inbox_id>

# Wait for email
ephemera messages wait <inbox_id> --subject "Verify" --timeout 60

# Extract code
ephemera messages extract <inbox_id>
```

---

## Test Automation Examples

### Playwright

```typescript
import { test, expect } from '@playwright/test';
import { EphemeraClient } from '@ephemera/sdk';

const ephemera = new EphemeraClient(process.env.EPHEMERA_API_KEY!);

test('signup with email verification', async ({ page }) => {
  const inbox = await ephemera.createInbox();

  await page.goto('/signup');
  await page.fill('[name="email"]', inbox.address);
  await page.fill('[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');

  const message = await ephemera.waitForEmail(inbox.id, {
    subject: 'Verify',
    timeout: 30000
  });

  const code = ephemera.extractCode(message)!;
  await page.fill('[name="code"]', code);
  await page.click('button:text("Verify")');

  await expect(page.locator('.welcome')).toBeVisible();
  await ephemera.deleteInbox(inbox.id);
});
```

### Pytest

```python
import pytest
from ephemera import EphemeraClient

@pytest.fixture
def ephemera():
    return EphemeraClient(os.environ["EPHEMERA_API_KEY"])

@pytest.fixture
def inbox(ephemera):
    inbox = ephemera.create_inbox()
    yield inbox
    ephemera.delete_inbox(inbox.id)

def test_signup_verification(ephemera, inbox, client):
    # Trigger signup
    client.post("/api/signup", json={
        "email": inbox.address,
        "password": "Test123!"
    })

    # Wait for verification email
    message = ephemera.wait_for_email(inbox.id, subject="Verify")
    code = ephemera.extract_code(message)

    assert code is not None
    assert len(code) == 6
```

---

## Rate Limits

| Tier | Requests/min | Inboxes/day | Webhooks |
|------|-------------|-------------|----------|
| FREE | 60 | 100 | 1 |
| STARTER | 300 | 1,000 | 3 |
| PROFESSIONAL | 600 | 10,000 | 10 |
| BUSINESS | 1,200 | 50,000 | 25 |
| ENTERPRISE | Unlimited | Unlimited | Unlimited |

### Handling Rate Limits

All SDKs handle rate limits automatically with exponential backoff. You can also catch rate limit exceptions:

```typescript
try {
  await client.createInbox();
} catch (error) {
  if (error instanceof RateLimitException) {
    await sleep(error.retryAfter * 1000);
    await client.createInbox();
  }
}
```

---

## Webhook Security

All SDKs include webhook signature verification using HMAC-SHA256 with constant-time comparison to prevent timing attacks.

### Headers

| Header | Description |
|--------|-------------|
| `X-Ephemera-Signature` | `sha256=<hmac>` |
| `X-Ephemera-Timestamp` | Unix timestamp |

### Verification Pattern

1. Get raw request body (not parsed JSON)
2. Concatenate: `{timestamp}.{body}`
3. Compute HMAC-SHA256 with webhook secret
4. Compare signatures using constant-time comparison
5. Validate timestamp within tolerance (5 minutes)

---

## Support

- **Documentation:** https://docs.manhquy.click
- **API Reference:** https://api.manhquy.click/docs
- **GitHub:** https://github.com/ephemera
