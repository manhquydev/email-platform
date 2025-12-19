# Node.js SDK Tutorial

Learn how to use the TempMail Pro Node.js SDK to integrate TempMail Pro into your Node.js applications. This tutorial covers installation, authentication, and common use cases.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- TempMail Pro instance running
- JWT token for authentication

## Installation

### Install the SDK

```bash
npm install @tempmailpro/sdk
# or
yarn add @tempmailpro/sdk
```

### Alternative: Use from Git

```bash
npm install git+https://github.com/tempmailpro/nodejs-sdk.git
```

## Basic Setup

### Initialize the Client

```javascript
const { TempMailClient } = require('@tempmailpro/sdk');

// Create client instance
const client = new TempMailClient({
  baseUrl: 'http://localhost:3001',
  email: 'admin@example.com',
  password: 'changeme'
});

// Or use environment variables
const client = new TempMailClient({
  baseUrl: process.env.TEMPMAIL_API_URL,
  email: process.env.TEMPMAIL_EMAIL,
  password: process.env.TEMPMAIL_PASSWORD
});
```

### Async/Await Usage

```javascript
async function main() {
  try {
    // Login
    await client.login();
    console.log('Logged in successfully!');

    // Use the client
    const domains = await client.domains.list();
    console.log('Domains:', domains);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### Promise Usage

```javascript
client.login()
  .then(() => {
    return client.domains.list();
  })
  .then(domains => {
    console.log('Domains:', domains);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## Authentication

### Login

```javascript
async function login() {
  const client = new TempMailClient({
    baseUrl: 'http://localhost:3001',
    email: 'admin@example.com',
    password: 'changeme'
  });

  try {
    await client.login();
    console.log('Token:', client.token);
    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    return false;
  }
}
```

### Using Custom Tokens

```javascript
const client = new TempMailClient({
  baseUrl: 'http://localhost:3001',
  token: 'your-jwt-token-here'
});

// Client is already authenticated
```

### Token Management

```javascript
const crypto = require('crypto');

async function secureTokenStorage() {
  const client = new TempMailClient({
    baseUrl: 'http://localhost:3001'
  });

  // Generate secure token storage
  const secureStore = {
    get: async () => {
      // Get from secure storage (e.g., keychain, encrypted file)
      return await getEncryptedToken();
    },
    set: async (token) => {
      // Store securely
      await storeEncryptedToken(token);
    }
  };

  // Try to get existing token
  const token = await secureStore.get();

  if (token) {
    client.setToken(token);
  } else {
    // Login and store token
    await client.login();
    await secureStore.set(client.token);
  }

  return client;
}
```

## Domain Management

### List Domains

```javascript
async function listDomains() {
  const client = await createClient();

  const result = await client.domains.list({
    page: 1,
    limit: 10,
    status: 'verified'
  });

  console.log('Total domains:', result.pagination.total);
  console.log('Domains:', result.data);

  return result.data;
}
```

### Create Domain

```javascript
async function createDomain(domainName, description = '') {
  const client = await createClient();

  const domain = await client.domains.create({
    domain: domainName,
    description: description,
    autoCreateInboxes: false
  });

  console.log('Created domain:', domain);
  return domain;
}
```

### Verify Domain

```javascript
async function verifyDomain(domainId) {
  const client = await createClient();

  const verification = await client.domains.verify(domainId, {
    spfRecord: 'v=spf1 mx include:_spf.tempmailpro.com ~all',
    dkimRecord: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
    dmarcRecord: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com'
  });

  console.log('Verification status:', verification.status);
  return verification;
}
```

## Inbox Management

### Create Inbox

```javascript
async function createInbox(domainName, inboxName = null) {
  const client = await createClient();

  const inbox = await client.inboxes.create({
    domain: domainName,
    name: inboxName,
    description: 'Test inbox'
  });

  console.log('Created inbox:', inbox.email);
  return inbox;
}
```

### List Inboxes

```javascript
async function listInboxes(domain = null) {
  const client = await createClient();

  const options = {
    page: 1,
    limit: 20
  };

  if (domain) {
    options.domain = domain;
  }

  const result = await client.inboxes.list(options);

  console.log(`Found ${result.pagination.total} inboxes`);
  result.data.forEach(inbox => {
    console.log(`- ${inbox.email} (${inbox.messageCount} messages)`);
  });

  return result.data;
}
```

### Delete Inbox

```javascript
async function deleteInbox(inboxId) {
  const client = await createClient();

  await client.inboxes.delete(inboxId);
  console.log(`Deleted inbox ${inboxId}`);
}
```

## Message Operations

### Get Messages

```javascript
async function getMessages(inboxId, options = {}) {
  const client = await createClient();

  const defaultOptions = {
    limit: 50,
    sort: 'createdAt',
    order: 'desc'
  };

  const searchOptions = { ...defaultOptions, ...options };

  const result = await client.messages.list(inboxId, searchOptions);

  console.log(`Found ${result.pagination.total} messages`);
  result.data.forEach(message => {
    console.log(`- ${message.subject} from ${message.from}`);
  });

  return result.data;
}
```

### Search Messages

```javascript
async function searchMessages(query, filters = {}) {
  const client = await createClient();

  const result = await client.messages.search(query, {
    page: 1,
    limit: 20,
    ...filters
  });

  console.log(`Search results for "${query}": ${result.pagination.total} messages`);
  return result.data;
}
```

### Get Message Details

```javascript
async function getMessageDetails(messageId) {
  const client = await createClient();

  const message = await client.messages.get(messageId);

  console.log('Message details:');
  console.log(`From: ${message.from}`);
  console.log(`Subject: ${message.subject}`);
  console.log(`Date: ${message.createdAt}`);
  console.log(`Attachments: ${message.attachments?.length || 0}`);

  if (message.text) {
    console.log('Text preview:', message.text.substring(0, 100) + '...');
  }

  return message;
}
```

### Download Attachment

```javascript
const fs = require('fs').promises;

async function downloadAttachment(attachmentId, filename = null) {
  const client = await createClient();

  const attachment = await client.messages.downloadAttachment(attachmentId);

  // Save to file
  const outputPath = filename || `attachment-${attachmentId}`;

  await fs.writeFile(outputPath, attachment);
  console.log(`Downloaded attachment to ${outputPath}`);

  return outputPath;
}
```

## Advanced Usage

### Pagination Helper

```javascript
async function getAllPages(endpoint, params = {}) {
  const client = await createClient();
  let allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await endpoint({
      ...params,
      page,
      limit: 100
    });

    allData = allData.concat(result.data);

    hasMore = page < result.pagination.totalPages;
    page++;
  }

  return allData;
}

// Usage: Get all messages
async function getAllMessages(inboxId) {
  const client = await createClient();

  const allMessages = await getAllPages(
    (options) => client.messages.list(inboxId, options)
  );

  console.log(`Total messages: ${allMessages.length}`);
  return allMessages;
}
```

### Rate Limiting

```javascript
class RateLimitedClient {
  constructor(client) {
    this.client = client;
    this.queue = [];
    this.isProcessing = false;
  }

  async request(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { requestFn, resolve, reject } = this.queue.shift();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.queue.unshift({ requestFn, resolve, reject });
        } else {
          reject(error);
        }
      }
    }

    this.isProcessing = false;
  }
}

// Usage
const rateLimitedClient = new RateLimitedClient(client);
const domains = await rateLimitedClient.request(() => client.domains.list());
```

### Event Handling

```javascript
const EventEmitter = require('events');

class TempMailEvents extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.setupPolling();
  }

  setupPolling() {
    // Poll for new messages every 30 seconds
    setInterval(async () => {
      try {
        const domains = await this.client.domains.list();

        for (const domain of domains.data) {
          const inboxes = await this.client.inboxes.list({
            domain: domain.domain,
            limit: 50
          });

          for (const inbox of inboxes.data) {
            const messages = await this.client.messages.list(inbox.id, {
              limit: 1,
              sort: 'createdAt',
              order: 'desc'
            });

            // Emit new message event
            if (messages.data.length > 0) {
              this.emit('newMessage', {
                inbox,
                message: messages.data[0]
              });
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000);
  }
}

// Usage
const events = new TempMailEvents(client);
events.on('newMessage', (data) => {
  console.log('New message received:', data.message.subject);
});
```

## Error Handling

### Basic Error Handling

```javascript
async function safeOperation() {
  const client = await createClient();

  try {
    const result = await client.inboxes.create({
      domain: 'example.com',
      name: 'test-inbox'
    });

    return result;
  } catch (error) {
    console.error('Operation failed:', error.message);

    if (error.code === 'UNAUTHORIZED') {
      // Handle authentication error
      await client.login();
      return await client.inboxes.create({
        domain: 'example.com',
        name: 'test-inbox'
      });
    }

    throw error;
  }
}
```

### Comprehensive Error Handling

```javascript
class TempMailError extends Error {
  constructor(response) {
    super(response.error);
    this.code = response.code;
    this.details = response.details;
    this.statusCode = response.status;
  }
}

async function handleError(error) {
  if (error instanceof TempMailError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        console.error('Authentication required');
        break;
      case 'FORBIDDEN':
        console.error('Access denied');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limit exceeded');
        break;
      case 'NOT_FOUND':
        console.error('Resource not found');
        break;
      default:
        console.error('API Error:', error.message);
    }
  } else {
    console.error('Network Error:', error.message);
  }
}

// Usage
try {
  const result = await client.domains.create('test.com');
} catch (error) {
  await handleError(error);
}
```

## Webhook Integration

### Simple Webhook Example

```javascript
const http = require('http');

async function startWebhookServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const event = JSON.parse(body);

          // Verify signature if needed
          // verifySignature(event);

          switch (event.type) {
            case 'message.created':
              await handleNewMessage(event.data);
              break;
            case 'inbox.created':
              await handleNewInbox(event.data);
              break;
          }

          res.writeHead(200);
          res.end('OK');
        } catch (error) {
          console.error('Webhook error:', error);
          res.writeHead(500);
          res.end('Error');
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
  });
}

async function handleNewMessage(message) {
  console.log('New message received:', message.subject);

  // Process message
  const client = await createClient();
  const fullMessage = await client.messages.get(message.id);

  // Send notification
  sendNotification('New Email', fullMessage.subject);
}

async function handleNewInbox(inbox) {
  console.log('New inbox created:', inbox.email);
}
```

## Real-time Updates

### WebSocket Example

```javascript
const WebSocket = require('ws');

class TempMailWebSocket {
  constructor(client) {
    this.client = client;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const protocol = 'ws://';
    const wsUrl = `${protocol}${this.client.baseUrl.replace(/^https?:\/\//, '')}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      // Authenticate
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.client.token
      }));
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'message.created':
        this.handleNewMessage(message.data);
        break;
      case 'inbox.created':
        this.handleNewInbox(message.data);
        break;
    }
  }

  handleNewMessage(message) {
    console.log('New message via WebSocket:', message.subject);

    // Update UI or trigger actions
    this.emit('newMessage', message);
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }
}

// Usage
const wsClient = new TempMailWebSocket(client);
wsClient.connect();
```

## Testing

### Unit Tests with Jest

```javascript
const { TempMailClient } = require('@tempmailpro/sdk');
const fetch = require('node-fetch');

jest.mock('node-fetch');

describe('TempMailClient', () => {
  let client;

  beforeEach(() => {
    client = new TempMailClient({
      baseUrl: 'http://localhost:3001',
      email: 'test@example.com',
      password: 'test123'
    });

    // Mock fetch responses
    fetch.mockImplementation((url, options) => {
      if (url.includes('/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-token' })
        });
      }

      if (url.includes('/domains')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [{ id: '1', domain: 'test.com' }],
            pagination: { total: 1 }
          })
        });
      }

      return Promise.resolve({ ok: false });
    });
  });

  test('should login successfully', async () => {
    await client.login();
    expect(client.token).toBe('mock-token');
  });

  test('should list domains', async () => {
    await client.login();
    const domains = await client.domains.list();
    expect(domains.data).toHaveLength(1);
    expect(domains.data[0].domain).toBe('test.com');
  });
});
```

### Integration Tests

```javascript
const { TempMailClient } = require('@tempmailpro/sdk');
const { setupTestEnv, cleanupTestEnv } = require('./test-utils');

describe('TempMail Integration', () => {
  let client;
  let testEnv;

  beforeAll(async () => {
    testEnv = await setupTestEnv();
    client = new TempMailClient({
      baseUrl: testEnv.apiUrl,
      email: testEnv.adminEmail,
      password: testEnv.adminPassword
    });
  });

  afterAll(async () => {
    await cleanupTestEnv(testEnv);
  });

  test('should create and verify domain', async () => {
    await client.login();

    const domain = await client.domains.create('test.example.com');
    expect(domain.domain).toBe('test.example.com');

    // Note: In real test, you'd need to mock DNS responses
  });

  test('should create inbox and receive messages', async () => {
    await client.login();

    const inbox = await client.inboxes.create({
      domain: 'test.example.com',
      name: 'test-inbox'
    });

    expect(inbox.email).toMatch(/@test\.example\.com$/);

    // Mock message reception
    const messages = await client.messages.list(inbox.id);
    expect(messages.data).toHaveLength(0); // Initially empty
  });
});
```

## Best Practices

### 1. Connection Management

```javascript
class ConnectionPool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.connections = new Set();
    this.waiting = [];
  }

  async getConnection() {
    if (this.connections.size < this.maxConnections) {
      const client = await createClient();
      this.connections.add(client);
      return client;
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  releaseConnection(client) {
    this.connections.delete(client);

    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      next(this.getConnection());
    }
  }
}
```

### 2. Caching

```javascript
const NodeCache = require('node-cache');

class APICache {
  constructor(ttl = 300) {
    this.cache = new NodeCache({ stdTTL: ttl, checkperiod: 600 });
  }

  async get(key, fetchFn) {
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const data = await fetchFn();
    this.cache.set(key, data);
    return data;
  }

  invalidate(pattern) {
    const keys = this.cache.keys(pattern);
    this.cache.del(keys);
  }
}

// Usage
const cache = new APICache();

async function getCachedDomains() {
  return await cache.get('domains', () => client.domains.list());
}
```

### 3. Monitoring

```javascript
const client = new TempMailClient({
  baseUrl: 'http://localhost:3001',
  email: 'admin@example.com',
  password: 'changeme'
});

// Track API calls
client.on('request', (endpoint, duration, success) => {
  console.log(`${endpoint} - ${duration}ms - ${success ? 'OK' : 'ERROR'}`);

  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    trackMetric('api_request', {
      endpoint,
      duration,
      success: success ? 1 : 0
    });
  }
});
```

## Complete Example

Here's a complete example that demonstrates all the features:

```javascript
const { TempMailClient } = require('@tempmailpro/sdk');
const fs = require('fs').promises;

class TempMailApp {
  constructor(config) {
    this.client = new TempMailClient(config);
    this.running = false;
  }

  async start() {
    console.log('Starting TempMail application...');

    // Login
    await this.client.login();
    console.log('✓ Logged in successfully');

    // Create domain if needed
    const domains = await this.client.domains.list();
    let domain = domains.data.find(d => d.domain === 'app.example.com');

    if (!domain) {
      domain = await this.client.domains.create('app.example.com', 'Application domain');
      console.log('✓ Created domain');
    }

    // Create inbox
    const inbox = await this.client.inboxes.create({
      domain: domain.domain,
      name: 'app-inbox'
    });

    console.log(`✓ Created inbox: ${inbox.email}`);

    // Start monitoring
    this.running = true;
    await this.monitorInbox(inbox.id);

    return inbox;
  }

  async monitorInbox(inboxId) {
    console.log('📧 Monitoring inbox for messages...');

    while (this.running) {
      try {
        const messages = await this.client.messages.list(inboxId, {
          limit: 10,
          sort: 'createdAt',
          order: 'desc'
        });

        // Process new messages
        for (const message of messages.data) {
          await this.processMessage(message);
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 30000));

      } catch (error) {
        console.error('Monitoring error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processMessage(message) {
    console.log(`📨 New message: ${message.subject}`);

    // Save message to file
    const filename = `message-${message.id}.json`;
    await fs.writeFile(filename, JSON.stringify(message, null, 2));

    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      console.log(`📎 Found ${message.attachments.length} attachments`);

      for (const attachment of message.attachments) {
        try {
          const buffer = await this.client.messages.downloadAttachment(attachment.id);
          const attachmentFilename = `attachment-${attachment.id}-${attachment.filename}`;
          await fs.writeFile(attachmentFilename, buffer);
          console.log(`💾 Downloaded: ${attachmentFilename}`);
        } catch (error) {
          console.error(`Failed to download attachment ${attachment.id}:`, error);
        }
      }
    }

    // Mark as read
    await this.client.messages.update(message.id, { read: true });
  }

  async stop() {
    this.running = false;
    console.log('Stopping TempMail application...');
  }
}

// Usage
async function main() {
  const app = new TempMailApp({
    baseUrl: 'http://localhost:3001',
    email: 'admin@example.com',
    password: 'changeme'
  });

  try {
    const inbox = await app.start();
    console.log('Application running. Press Ctrl+C to stop.');

    // Keep process alive
    process.on('SIGINT', async () => {
      await app.stop();
      process.exit(0);
    });

    // Run indefinitely
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## Next Steps

Now that you've mastered the Node.js SDK:

- [Learn about the Python SDK](python-sdk.md)
- [Explore the API documentation](../api/)
- [Set up custom domains](../guides/custom-domains.md)
- [Configure email forwarding](../guides/email-forwarding.md)

For more advanced usage, check out:
- [API documentation](../api/)
- [Source code on GitHub](https://github.com/tempmailpro/nodejs-sdk)
- [Community discussions](https://github.com/tempmailpro/tempmailpro/discussions)

Need help? Join our Discord or open an issue on GitHub.