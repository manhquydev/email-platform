---
sidebar_position: 3
---

# Rate Limiting

Understanding and handling API rate limits.

## Limits by Plan

| Plan | Requests/min | Inboxes/day | Webhooks |
|------|-------------|-------------|----------|
| Free | 60 | 100 | 1 |
| Pro | 600 | 10,000 | 10 |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Response Headers

Every response includes rate limit info:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706123456
```

## Handling 429 Errors

When rate limited, you'll receive:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "status": 429
  }
}
```

With header:
```
Retry-After: 30
```

## SDK Handling

SDKs handle rate limits automatically:

```javascript
const client = new EphemeraClient(apiKey, {
  maxRetries: 3,        // Retry up to 3 times
  retryDelay: 1000,     // Base delay 1s
  retryOnRateLimit: true
});
```

```python
client = EphemeraClient(
    api_key,
    max_retries=3,
    retry_on_rate_limit=True
)
```

## Best Practices

1. **Cache responses** - Don't re-fetch unchanged data
2. **Use webhooks** - Instead of polling for messages
3. **Batch where possible** - Reduce request count
4. **Implement backoff** - Respect Retry-After header

```javascript
try {
  await client.createInbox();
} catch (error) {
  if (error instanceof RateLimitException) {
    await sleep(error.retryAfter * 1000);
    await client.createInbox(); // Retry
  }
}
```
