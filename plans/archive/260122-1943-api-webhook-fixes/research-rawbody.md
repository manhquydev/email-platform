# Research: Fastify Raw Body for Stripe Webhooks

## Executive Summary
Stripe webhook verification requires the exact raw request body (Buffer or string) to verify signatures. In Fastify, the default JSON parser consumes the stream, making the raw body inaccessible. The `fastify-raw-body` plugin is the standard solution, but requires careful configuration to avoid conflicts with other body parsers and ensure performance.

## Best Practices Configuration

### 1. Plugin Registration
Register `fastify-raw-body` **before** any other body parsers or routes. Use `global: false` to minimize overhead and avoid buffering bodies for non-webhook routes.

```typescript
import fastifyRawBody from 'fastify-raw-body';

// Must be registered BEFORE routes
await fastify.register(fastifyRawBody, {
  field: 'rawBody', // attach to req.rawBody
  global: false,    // standard practice: only enable on specific routes
  encoding: 'utf8', // strictly required for Stripe
  runFirst: true,   // CRITICAL: run before default JSON parser
});
```

### 2. Route-Specific Configuration
Enable raw body collection specifically for the Stripe webhook route via `config`.

```typescript
fastify.post('/webhook', {
  config: {
    rawBody: true // enables the plugin for this route
  },
  handler: async (req, reply) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody; // Available due to config

    try {
      // Stripe requires the raw body string/buffer
      stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      reply.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
});
```

### 3. Pre-computed Body (Alternative)
If you need the body parsed as JSON *and* raw (e.g., logging), `fastify-raw-body` handles this gracefully. When enabled, it reads the stream, attaches `rawBody`, and allows the default JSON parser to still parse `req.body` from the buffered content.

## Common Pitfalls & Solutions

| Pitfall | Impact | Solution |
|---------|--------|----------|
| **Missing `runFirst: true`** | `req.rawBody` is undefined or empty because default parser consumed stream first. | Always set `runFirst: true` in plugin options. |
| **Wrong Encoding** | Signature verification fails (mismatch). | Set `encoding: 'utf8'` explicitly. |
| **Global Enabled** | Performance degradation (buffers every request). | Set `global: false` and use route `config`. |
| **Content-Type Mismatch** | Fastify returns 415 or parses incorrectly. | Ensure Stripe sends `application/json`. If custom, add content type parser for `application/json` that calls default but allows raw access. |
| **Body Size Limits** | Webhook fails for large payloads. | Configure `bodyLimit` in Fastify or route options (default is usually 1MB). |

## Recommended Implementation Path
1. Install `fastify-raw-body`.
2. Register it globally with `global: false` and `runFirst: true`.
3. Apply `config: { rawBody: true }` solely to the Stripe webhook endpoint.
4. Pass `req.rawBody` to `stripe.webhooks.constructEvent`.

## Unresolved Questions
- Does the current `services/api` structure verify `stripe-signature` in middleware or handler?
- Are there existing global body parsers that might conflict?
