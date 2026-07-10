---
sidebar_position: 2
---

# Authentication

All API requests require authentication via API key.

## Getting Your API Key

1. Sign up at [dashboard.manhquy.id.vn](https://dashboard.manhquy.id.vn)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Copy and securely store your key

:::caution
API keys are shown only once. Store them securely and never commit to version control.
:::

## Using Your API Key

### HTTP Header

```bash
curl https://api.manhquy.id.vn/v1/inboxes \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### SDK Initialization

```javascript
// JavaScript
const client = new EphemeraClient('YOUR_API_KEY');
```

```python
# Python
client = EphemeraClient("YOUR_API_KEY")
```

```go
// Go
client := ephemera.NewClient("YOUR_API_KEY")
```

## Environment Variables

Store your API key in environment variables:

```bash
# .env (add to .gitignore!)
EPHEMERA_API_KEY=eph_live_xxxxxxxxxxxx
```

```javascript
const client = new EphemeraClient(process.env.EPHEMERA_API_KEY);
```

## API Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| Live | `eph_live_` | Production use |
| Test | `eph_test_` | Development/testing |

## Rate Limits

| Plan | Requests/min | Inboxes/day |
|------|-------------|-------------|
| Free | 60 | 100 |
| Pro | 600 | 10,000 |
| Enterprise | Unlimited | Unlimited |

When rate limited, you'll receive a `429` response with `Retry-After` header.
