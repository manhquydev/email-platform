# Research Report: OWASP API Security Top 10 (2023) & Fastify Best Practices

## 1. Executive Summary
This report analyzes the OWASP API Security Top 10 (2023) vulnerabilities and maps them to concrete mitigation strategies for the Ephemera Email Platform (Node.js/Fastify). The focus is on leveraging Fastify's built-in schema validation and ecosystem to enforce security by default.

## 2. OWASP Top 10 (2023) Vulnerabilities & Fastify Mitigations

| Vulnerability | Description | Fastify Mitigation Strategy |
| :--- | :--- | :--- |
| **API1: BOLA** | Broken Object Level Authorization (IDOR) | Implement `preHandler` ownership checks on every route with IDs. Use UUIDs. |
| **API2: Broken Auth** | Weak authentication mechanisms | Use `@fastify/jwt` or `@fastify/auth`. Enforce strong password policies. |
| **API3: BOPLA** | Broken Object Property Level Auth | Use JSON Schema `additionalProperties: false` to filter inputs. Use serialization schemas to filter outputs. |
| **API4: Resource Consumption** | DoS via API abuse | Implement `@fastify/rate-limit`. Set request body size limits. |
| **API5: Broken Function Auth** | IDOR at function/role level | Middleware checks for roles (e.g., `verifyRole('admin')`). |
| **API6: Sensitive Flows** | Abuse of business logic (e.g., buying) | stricter rate limits on specific endpoints. Logic validation. |
| **API7: SSRF** | Server Side Request Forgery | Validate URLs in input. specific allowlists for external calls. |
| **API8: Misconfiguration** | Default/insecure settings | Disable detailed errors in prod. Use `helmet` headers via `@fastify/helmet`. |
| **API9: Improper Inventory** | Unknown/outdated APIs | Auto-generate Swagger/OpenAPI docs via `@fastify/swagger`. |
| **API10: Unsafe Consumption** | Trusting 3rd party APIs | Validate 3rd party webhooks/responses just like user input. |

## 3. Key Implementation Patterns

### 3.1 BOLA Prevention (API1)
**Pattern:** Use a `preHandler` hook to verify resource ownership before business logic executes.

```typescript
// decorators/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export const verifyOwnership = (resourceModel: any) =>
  async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = req.user.id;
    const resourceId = req.params.id;

    const resource = await resourceModel.findById(resourceId);
    if (!resource || resource.ownerId !== userId) {
      throw new Error('Unauthorized access to resource'); // Returns 403
    }
  };

// routes/emails.ts
fastify.get('/emails/:id', {
  preHandler: [fastify.authenticate, verifyOwnership(EmailModel)],
  handler: async (req, reply) => { /* logic */ }
});
```

### 3.2 Input Validation & Injection Prevention (API3, API8)
**Pattern:** Fastify's native JSON Schema validation blocks bad input *before* it reaches handlers.

```typescript
const emailSchema = {
  body: {
    type: 'object',
    required: ['recipient', 'subject', 'content'],
    additionalProperties: false, // Prevents Mass Assignment (BOPLA)
    properties: {
      recipient: { type: 'string', format: 'email' },
      subject: { type: 'string', minLength: 1, maxLength: 255 },
      content: { type: 'string', maxLength: 10000 } // Prevents Resource Consumption
    }
  }
};

fastify.post('/send', { schema: emailSchema }, handler);
```

### 3.3 Rate Limiting (API4)
**Pattern:** Apply global limits + stricter limits for sensitive endpoints (login, password reset).

```typescript
import rateLimit from '@fastify/rate-limit';

// Global limit
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Route specific limit
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute'
    }
  }
}, loginHandler);
```

## 4. Unresolved Questions
1. Do we use a centralized CASL-like library for fine-grained permissions, or ad-hoc checks?
2. Is there an existing Redis instance available for distributed rate limiting?

## 5. Sources
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [Fastify Validation & Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify Rate Limit](https://github.com/fastify/fastify-rate-limit)
