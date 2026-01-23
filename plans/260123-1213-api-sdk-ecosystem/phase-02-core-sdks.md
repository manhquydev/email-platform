# Phase 2: Core SDKs

```yaml
status: pending
priority: HIGH
duration: 6-8 weeks
dependencies: [phase-01-foundation]
```

## Overview

Enhance existing SDKs (Python, JS/TS, CLI) và tạo Go SDK mới. Tất cả SDKs dựa trên OpenAPI spec từ Phase 1.

## Context Links

- [Main Plan](./plan.md)
- [Phase 1: Foundation](./phase-01-foundation.md)
- [Existing JS SDK](../../packages/sdk-js/)
- [Existing Python SDK](../../packages/sdk-python/)

---

## 1. JavaScript/TypeScript SDK Enhancement

### 1.1 Current State Analysis

**Existing Files:**
- `packages/sdk-js/src/client.ts` - 307 lines, basic methods
- `packages/sdk-js/src/types.ts` - Type definitions
- `packages/sdk-js/src/errors.ts` - Error classes

**Missing Features:**
- Async iterators for pagination
- Webhook signature verification
- Rate limit handling
- Retry with backoff
- Real-time subscriptions (SSE)

### 1.2 Enhancement Tasks

**Files to Create/Modify:**

```
packages/sdk-js/
├── src/
│   ├── client.ts           # Enhance
│   ├── types.ts            # Enhance
│   ├── errors.ts           # Keep
│   ├── pagination.ts       # NEW
│   ├── rate-limit.ts       # NEW
│   ├── retry.ts            # NEW
│   ├── webhook.ts          # NEW
│   ├── realtime.ts         # NEW (SSE client)
│   └── index.ts            # Update exports
├── package.json
├── tsconfig.json
└── README.md
```

**Implementation:**

```typescript
// pagination.ts
export async function* paginate<T>(
  client: EphemeraClient,
  endpoint: string,
  options: PaginateOptions = {}
): AsyncGenerator<T> {
  let cursor = options.cursor;
  const limit = options.limit || 50;

  while (true) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);

    const response = await client.request<PaginatedResponse<T>>(
      'GET',
      `${endpoint}?${params}`
    );

    for (const item of response.data) {
      yield item;
    }

    if (!response.nextCursor) break;
    cursor = response.nextCursor;
  }
}

// Usage:
for await (const inbox of client.listInboxesPaginated()) {
  console.log(inbox.address);
}
```

```typescript
// webhook.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceMs = 300000
): boolean {
  const now = Date.now();
  if (Math.abs(now - timestamp * 1000) > toleranceMs) {
    throw new WebhookError('Timestamp too old');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

```typescript
// realtime.ts
export class RealtimeClient {
  private eventSource: EventSource | null = null;

  constructor(
    private client: EphemeraClient,
    private inboxId: string
  ) {}

  onMessage(callback: (message: Message) => void): void {
    const url = `${this.client.baseUrl}/realtime/inboxes/${this.inboxId}/messages`;
    this.eventSource = new EventSource(url, {
      headers: { Authorization: `Bearer ${this.client.apiKey}` }
    });

    this.eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      callback(message);
    };
  }

  close(): void {
    this.eventSource?.close();
  }
}
```

### 1.3 Todo Checklist

- [ ] Add async pagination iterators
- [ ] Implement rate limit handling with headers
- [ ] Add retry with exponential backoff
- [ ] Create webhook verification utility
- [ ] Add SSE realtime client
- [ ] Update types from OpenAPI spec
- [ ] Add comprehensive JSDoc comments
- [ ] Write unit tests (90%+ coverage)
- [ ] Update README with examples
- [ ] Publish to npm as `@ephemera/sdk`

---

## 2. Python SDK Enhancement

### 2.1 Current State Analysis

**Existing Files:**
- `packages/sdk-python/ephemera/client.py` - 170 lines, sync only
- `packages/sdk-python/ephemera/models.py` - Pydantic models
- `packages/sdk-python/ephemera/exceptions.py` - Error classes

**Missing Features:**
- Async client (asyncio)
- Pagination helpers
- Webhook verification
- Rate limit handling
- Type hints improvement

### 2.2 Enhancement Tasks

**Files to Create/Modify:**

```
packages/sdk-python/
├── ephemera/
│   ├── __init__.py         # Update exports
│   ├── client.py           # Sync client (enhance)
│   ├── async_client.py     # NEW - Async client
│   ├── models.py           # Enhance with OpenAPI
│   ├── exceptions.py       # Keep
│   ├── pagination.py       # NEW
│   ├── rate_limit.py       # NEW
│   ├── webhook.py          # NEW
│   └── py.typed            # NEW - PEP 561
├── tests/
│   ├── test_client.py
│   ├── test_async_client.py
│   └── test_webhook.py
├── pyproject.toml
└── README.md
```

**Implementation:**

```python
# async_client.py
import httpx
from typing import AsyncIterator

class AsyncEphemeraClient:
    """Async client for Ephemera API."""

    def __init__(self, api_key: str, base_url: str = "https://api.manhquy.click/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "ephemera-python/1.0.0",
            },
        )

    async def __aenter__(self) -> "AsyncEphemeraClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    async def create_inbox(self, **kwargs) -> Inbox:
        response = await self._client.post("/inboxes", json=kwargs)
        response.raise_for_status()
        return Inbox.model_validate(response.json())

    async def list_inboxes(self) -> AsyncIterator[Inbox]:
        """Async iterator for paginated inbox listing."""
        cursor = None
        while True:
            params = {"limit": 50}
            if cursor:
                params["cursor"] = cursor
            response = await self._client.get("/inboxes", params=params)
            data = response.json()
            for inbox in data["data"]:
                yield Inbox.model_validate(inbox)
            cursor = data.get("nextCursor")
            if not cursor:
                break

    async def wait_for_email(
        self,
        inbox_id: str,
        subject: str | None = None,
        timeout: float = 60.0,
    ) -> Message:
        """Async wait for email with polling."""
        import asyncio
        start = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start < timeout:
            messages = await self.get_messages(inbox_id)
            for msg in messages:
                if not subject or subject.lower() in msg.subject.lower():
                    return msg
            await asyncio.sleep(2.0)
        raise TimeoutError(f"No email found within {timeout}s")
```

```python
# webhook.py
import hmac
import hashlib
import time

def verify_webhook(
    payload: bytes,
    signature: str,
    secret: str,
    timestamp: int,
    tolerance_seconds: int = 300,
) -> bool:
    """Verify webhook signature from Ephemera."""
    now = int(time.time())
    if abs(now - timestamp) > tolerance_seconds:
        raise WebhookError("Timestamp outside tolerance window")

    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{payload.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(signature, f"sha256={expected}")
```

### 2.3 Todo Checklist

- [ ] Create async client with httpx
- [ ] Add async iterators for pagination
- [ ] Implement rate limit handling
- [ ] Add retry with tenacity
- [ ] Create webhook verification
- [ ] Add py.typed marker (PEP 561)
- [ ] Generate models from OpenAPI
- [ ] Write pytest tests (90%+ coverage)
- [ ] Update README with async examples
- [ ] Publish to PyPI as `ephemera`

---

## 3. Go SDK (New)

### 3.1 Package Structure

```
packages/sdk-go/
├── ephemera/
│   ├── client.go           # Main client
│   ├── client_test.go
│   ├── domains.go          # Domain methods
│   ├── inboxes.go          # Inbox methods
│   ├── messages.go         # Message methods
│   ├── webhook.go          # Webhook verification
│   ├── errors.go           # Error types
│   ├── types.go            # Data types
│   └── pagination.go       # Pagination helpers
├── go.mod
├── go.sum
├── README.md
└── examples/
    ├── basic/main.go
    └── webhook/main.go
```

### 3.2 Implementation

```go
// client.go
package ephemera

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

const (
    DefaultBaseURL = "https://api.manhquy.click/v1"
    DefaultTimeout = 30 * time.Second
)

type Client struct {
    apiKey     string
    baseURL    string
    httpClient *http.Client
}

type ClientOption func(*Client)

func NewClient(apiKey string, opts ...ClientOption) *Client {
    c := &Client{
        apiKey:  apiKey,
        baseURL: DefaultBaseURL,
        httpClient: &http.Client{
            Timeout: DefaultTimeout,
        },
    }
    for _, opt := range opts {
        opt(c)
    }
    return c
}

func WithBaseURL(url string) ClientOption {
    return func(c *Client) {
        c.baseURL = url
    }
}

func (c *Client) do(ctx context.Context, method, path string, body, result interface{}) error {
    req, err := c.newRequest(ctx, method, path, body)
    if err != nil {
        return err
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return &NetworkError{Err: err}
    }
    defer resp.Body.Close()

    // Handle rate limit headers
    c.handleRateLimitHeaders(resp)

    if resp.StatusCode >= 400 {
        return parseErrorResponse(resp)
    }

    if result != nil {
        return json.NewDecoder(resp.Body).Decode(result)
    }
    return nil
}
```

```go
// inboxes.go
package ephemera

import "context"

type Inbox struct {
    ID        string  `json:"id"`
    Address   string  `json:"address"`
    LocalPart string  `json:"localPart"`
    DomainID  string  `json:"domainId"`
    ExpiresAt *string `json:"expiresAt"`
    CreatedAt string  `json:"createdAt"`
}

type CreateInboxInput struct {
    LocalPart string `json:"localPart,omitempty"`
    DomainID  string `json:"domainId,omitempty"`
}

func (c *Client) CreateInbox(ctx context.Context, input *CreateInboxInput) (*Inbox, error) {
    var inbox Inbox
    err := c.do(ctx, "POST", "/inboxes", input, &inbox)
    return &inbox, err
}

func (c *Client) GetInbox(ctx context.Context, id string) (*Inbox, error) {
    var inbox Inbox
    err := c.do(ctx, "GET", "/inboxes/"+id, nil, &inbox)
    return &inbox, err
}

func (c *Client) DeleteInbox(ctx context.Context, id string) error {
    return c.do(ctx, "DELETE", "/inboxes/"+id, nil, nil)
}

// Iterator for pagination
func (c *Client) ListInboxes(ctx context.Context) *InboxIterator {
    return &InboxIterator{client: c, ctx: ctx}
}
```

```go
// webhook.go
package ephemera

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "math"
    "time"
)

func VerifyWebhookSignature(
    payload []byte,
    signature string,
    secret string,
    timestamp int64,
    toleranceSeconds int64,
) error {
    now := time.Now().Unix()
    if math.Abs(float64(now-timestamp)) > float64(toleranceSeconds) {
        return fmt.Errorf("timestamp outside tolerance window")
    }

    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(fmt.Sprintf("%d.%s", timestamp, payload)))
    expected := hex.EncodeToString(mac.Sum(nil))

    if !hmac.Equal([]byte(signature), []byte("sha256="+expected)) {
        return fmt.Errorf("invalid signature")
    }
    return nil
}
```

### 3.3 Todo Checklist

- [ ] Create go.mod with module `github.com/ephemera/sdk-go`
- [ ] Implement core client with context support
- [ ] Add domain, inbox, message methods
- [ ] Implement pagination iterator
- [ ] Add rate limit header handling
- [ ] Create webhook verification
- [ ] Write comprehensive tests
- [ ] Add godoc comments
- [ ] Create examples directory
- [ ] Publish to pkg.go.dev

---

## 4. CLI Enhancement

### 4.1 Current State

**Existing:** Minimal - only config exports

### 4.2 Target Commands

```bash
ephemera login                    # Authenticate
ephemera logout                   # Clear credentials

ephemera inbox create             # Create inbox
ephemera inbox list               # List inboxes
ephemera inbox delete <id>        # Delete inbox

ephemera message list <inbox-id>  # List messages
ephemera message get <id>         # Get message
ephemera message wait <inbox-id>  # Wait for email

ephemera webhook verify <file>    # Verify webhook payload

ephemera config set <key> <value> # Set config
ephemera config get <key>         # Get config
```

### 4.3 Implementation

**Files to Create:**

```
packages/cli/
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── login.ts
│   │   ├── inbox.ts
│   │   ├── message.ts
│   │   ├── webhook.ts
│   │   └── config.ts
│   ├── config.ts
│   └── utils/
│       ├── output.ts       # Table/JSON output
│       └── spinner.ts      # Loading indicator
├── bin/
│   └── ephemera.js
├── package.json
└── README.md
```

```typescript
// commands/inbox.ts
import { Command } from 'commander';
import { EphemeraClient } from '@ephemera/sdk';
import { getApiKey } from '../config';
import { printTable, printJson } from '../utils/output';

export const inboxCommand = new Command('inbox')
  .description('Manage inboxes');

inboxCommand
  .command('create')
  .option('-l, --local-part <part>', 'Local part of email')
  .option('-d, --domain <id>', 'Domain ID')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const client = new EphemeraClient(getApiKey());
    const inbox = await client.createInbox({
      localPart: options.localPart,
      domainId: options.domain,
    });

    if (options.json) {
      printJson(inbox);
    } else {
      console.log(`✅ Created inbox: ${inbox.address}`);
    }
  });

inboxCommand
  .command('list')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const client = new EphemeraClient(getApiKey());
    const inboxes = await client.listInboxes();

    if (options.json) {
      printJson(inboxes);
    } else {
      printTable(inboxes, ['id', 'address', 'createdAt']);
    }
  });
```

### 4.4 Todo Checklist

- [ ] Setup Commander.js CLI framework
- [ ] Implement login/logout commands
- [ ] Implement inbox CRUD commands
- [ ] Implement message commands
- [ ] Add wait command with spinner
- [ ] Add webhook verify command
- [ ] Add config management
- [ ] Support JSON/table output
- [ ] Add shell completion
- [ ] Publish to npm as `@ephemera/cli`

---

## Success Criteria

- [ ] JS SDK: npm package with 90%+ test coverage
- [ ] Python SDK: PyPI package with async support
- [ ] Go SDK: pkg.go.dev with idiomatic Go patterns
- [ ] CLI: Full command coverage with --help
- [ ] All SDKs: Webhook verification utility
- [ ] All SDKs: Rate limit handling
- [ ] All SDKs: Pagination support

---

## Next Phase

→ [Phase 3: Extended SDKs](./phase-03-extended-sdks.md)
