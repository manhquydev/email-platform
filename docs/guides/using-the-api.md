# Using the API Guide

Learn how to effectively use TempMail Pro's REST API for programmatic access to all features. This guide covers best practices, authentication, and advanced usage patterns.

## Overview

The TempMail Pro API provides:
- RESTful endpoints for all major features
- JWT-based authentication
- Comprehensive search and filtering
- Real-time webhook support (future)
- Rate limiting and error handling
- WebSocket support for real-time updates

## API Basics

### Base URL

```
Production: https://api.yourdomain.com
Development: http://localhost:3001
```

### Authentication

All endpoints (except health checks) require a JWT token:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Content-Type

Use `application/json` for request bodies:

```bash
Content-Type: application/json
```

### Response Format

All responses follow this structure:

```json
{
  "data": [],          // Response data
  "pagination": {},    // For paginated endpoints
  "error": null       // Error message if any
}
```

## Authentication Flow

### 1. Get JWT Token

```bash
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "changeme"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Use Token in Requests

```bash
# Store token securely
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in subsequent requests
curl -X GET "http://localhost:3001/inboxes" \
  -H "Authorization: Bearer $TOKEN"
```

## Rate Limiting

### Rate Limits

- Authentication: 5 requests per minute
- Domain operations: 10 requests per hour
- Inbox operations: 100 requests per hour
- Message operations: 1000 requests per hour
- Attachment downloads: 1000 requests per hour

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642784400
```

### Handling Rate Limits

```javascript
class RateLimitedClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.queue = [];
    this.isProcessing = false;
  }

  async request(endpoint, options = {}) {
    // Check rate limit
    const remaining = parseInt(response.headers['x-ratelimit-remaining']);

    if (remaining < 10) {
      const resetTime = parseInt(response.headers['x-ratelimit-reset']) * 1000;
      const waitTime = resetTime - Date.now();

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return this.makeRequest(endpoint, options);
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or expired token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Rate limit reached
- `INTERNAL_ERROR`: Server error

### Error Handling Example

```javascript
class APIError extends Error {
  constructor(response) {
    super(response.error);
    this.code = response.code;
    this.details = response.details;
    this.status = response.status;
  }
}

async function handleAPIRequest() {
  try {
    const response = await fetch('/api/endpoint', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      // Handle API-specific errors
      switch (error.code) {
        case 'UNAUTHORIZED':
          // Redirect to login
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Implement retry logic
          break;
        default:
          console.error('API Error:', error);
      }
    }
    throw error;
  }
}
```

## Core API Features

### 1. Domains Management

```javascript
// List domains
const domains = await fetch('/domains?page=1&limit=10').then(r => r.json());

// Create domain
const newDomain = await fetch('/domains', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'example.com',
    description: 'My domain'
  })
}).then(r => r.json());

// Verify domain
await fetch(`/domains/${newDomain.id}/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    spfRecord: 'v=spf1 mx ~all',
    dkimRecord: 'v=DKIM1; k=rsa; p=...',
    dmarcRecord: 'v=DMARC1; p=quarantine'
  })
});
```

### 2. Inbox Operations

```javascript
// Create inbox
const inbox = await fetch('/inboxes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'example.com',
    name: 'test-inbox'
  })
}).then(r => r.json());

// List messages
const messages = await fetch(`/inboxes/${inbox.id}/messages?limit=50`).then(r => r.json());

// Search messages
const searchResults = await fetch(`/messages/search?q=invoice`).then(r => r.json());
```

### 3. Message Handling

```javascript
// Get message details
const message = await fetch(`/messages/${messageId}`).then(r => r.json());

// Download attachment
const attachment = await fetch(`/attachments/${attachmentId}/download`).then(r => r.blob());

// Delete message
await fetch(`/messages/${messageId}`, {
  method: 'DELETE'
});
```

## Advanced API Usage

### 1. Pagination

```javascript
async function getAllPages(url) {
  let allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${url}?page=${page}&limit=100`);
    const data = await response.json();

    allData = allData.concat(data.data);

    hasMore = data.pagination.page < data.pagination.totalPages;
    page++;
  }

  return allData;
}

// Usage: Get all messages
const allMessages = await getAllPages('/messages');
```

### 2. Batch Operations

```javascript
// Batch delete messages
async function batchDeleteMessages(messageIds) {
  const promises = messageIds.map(id =>
    fetch(`/messages/${id}`, { method: 'DELETE' })
  );

  const results = await Promise.allSettled(promises);

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error('Failed to delete messages:', failures);
  }
}
```

### 3. Real-time Updates (WebSocket)

```javascript
class TempMailWebSocket {
  constructor(token) {
    this.token = token;
    this.socket = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({
        type: 'auth',
        token: this.token
      }));
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'message.created':
          this.handleNewMessage(message.data);
          break;
        case 'inbox.created':
          this.handleNewInbox(message.data);
          break;
      }
    };
  }

  handleNewMessage(message) {
    // Update UI with new message
    console.log('New message:', message);
  }
}
```

## Webhooks (Future Enhancement)

### Webhook Configuration

```javascript
// Configure webhook
await fetch('/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://your-webhook.com/listen',
    events: ['message.created', 'inbox.deleted'],
    secret: 'your-webhook-secret'
  })
});
```

### Webhook Verification

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  );
}
```

## SDK Usage Examples

### JavaScript SDK

```javascript
import { TempMailClient } from '@tempmailpro/sdk';

// Initialize client
const client = new TempMailClient({
  baseUrl: 'http://localhost:3001',
  email: 'admin@example.com',
  password: 'changeme'
});

// Login
await client.login();

// Create inbox
const inbox = await client.inboxes.create({
  domain: 'example.com',
  name: 'my-inbox'
});

// Get messages
const messages = await client.messages.list({
  inboxId: inbox.id,
  limit: 20
});

// Search messages
const results = await client.messages.search('invoice');
```

### Python SDK

```python
from tempmailpro import TempMailClient

# Initialize client
client = TempMailClient(
    base_url='http://localhost:3001',
    email='admin@example.com',
    password='changeme'
)

# Login
client.login()

# Create domain
domain = client.domains.create(
    domain='example.com',
    description='My domain'
)

# Verify domain
client.domains.verify(
    domain_id=domain.id,
    spf_record='v=spf1 mx ~all',
    dkim_record='v=DKIM1; k=rsa; p=...',
    dmarc_record='v=DMARC1; p=quarantine'
)

# Get all messages
messages = client.messages.list(limit=100)
```

## Testing the API

### 1. Unit Testing

```javascript
// Jest example
describe('TempMail API', () => {
  let client;

  beforeEach(() => {
    client = new TempMailClient({
      baseUrl: 'http://localhost:3001',
      email: 'test@example.com',
      password: 'test123'
    });
  });

  test('should login successfully', async () => {
    const response = await client.login();
    expect(response.token).toBeDefined();
  });

  test('should create domain', async () => {
    await client.login();
    const domain = await client.domains.create('test.com');
    expect(domain.domain).toBe('test.com');
  });
});
```

### 2. Integration Testing

```bash
# Test API health
curl http://localhost:3001/health

# Test login flow
TOKEN=$(curl -s -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme"}' | \
  jq -r '.token')

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/inboxes
```

## Performance Optimization

### 1. Caching

```javascript
class APIClient {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async cachedRequest(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await this.request(endpoint, options);

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }
}
```

### 2. Connection Pooling

```javascript
// Using node-fetch with keep-alive
import fetch, { Agent } from 'node-fetch';

const agent = new Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5
});

const client = fetch('http://localhost:3001', {
  agent,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 3. Request Batching

```javascript
// Batch multiple requests
async function batchRequests(requests) {
  const promises = requests.map(req =>
    fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body
    })
  );

  const responses = await Promise.allSettled(promises);

  return responses.map((response, index) => ({
    ...requests[index],
    response: response.status === 'fulfilled' ?
      response.value : response.reason
  }));
}
```

## Security Best Practices

### 1. Secure Token Storage

```javascript
// Use secure storage
class SecureTokenStorage {
  static async getToken() {
    // Use browser secure storage or encrypted local storage
    return await this.getSecureItem('tempmail_token');
  }

  static async setToken(token) {
    await this.setSecureItem('tempmail_token', token);
  }

  static async clearToken() {
    await this.removeSecureItem('tempmail_token');
  }
}
```

### 2. HTTPS in Production

```javascript
// Always use HTTPS in production
const isSecure = window.location.protocol === 'https:';
const apiBaseUrl = isSecure ?
  'https://api.yourdomain.com' :
  'http://localhost:3001';
```

### 3. Request Signing

```javascript
import crypto from 'crypto';

function signRequest(method, path, body, secret) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');

  const signature = crypto.createHmac('sha256', secret)
    .update(`${method}:${path}:${timestamp}:${nonce}:${JSON.stringify(body)}`)
    .digest('hex');

  return {
    timestamp,
    nonce,
    signature
  };
}
```

## Monitoring and Observability

### 1. API Metrics

```javascript
// Track API usage
const apiMetrics = {
  requests: 0,
  errors: 0,
  totalResponseTime: 0,

  trackRequest(responseTime, success) {
    this.requests++;
    this.totalResponseTime += responseTime;

    if (!success) {
      this.errors++;
    }
  },

  getAverageResponseTime() {
    return this.totalResponseTime / this.requests;
  },

  getErrorRate() {
    return (this.errors / this.requests) * 100;
  }
};
```

### 2. Logging

```javascript
class APILogger {
  static log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to logging service
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[level](message, data);
    }
  }
}
```

## Next Steps

- [Learn about custom domains](custom-domains.md)
- [Set up email forwarding](email-forwarding.md)
- [Explore the API documentation](../api/)
- [Try our SDK tutorials](../tutorials/)

Need more help? Check our [FAQ](../faq/) or browse our other guides.