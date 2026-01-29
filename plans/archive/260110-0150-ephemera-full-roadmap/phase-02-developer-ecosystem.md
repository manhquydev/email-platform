# Phase 02: Developer Ecosystem

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 01 (privacy docs referenced in SDK examples)
- **Code Standards:** [docs/code-standards.md](../../docs/code-standards.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-10 |
| Priority | P1 |
| Effort | 16h |
| Status | pending |

**Goal:** Enable developers to integrate Ephemera programmatically via SDKs, CLI, and enhanced webhook tooling.

## Key Insights (from Research)
- SDK must feel native: Promises/async in JS, context managers in Python
- Single command install + minimal config = adoption
- Actionable error messages with codes, not vague failures
- Commander.js for CLI with chalk/ora for UX
- Click for Python with `@click.group()` for Git-like interface

## Requirements

### R1: JavaScript SDK (npm)
- Package: `@ephemera/sdk`
- Methods: `createInbox()`, `getMessages()`, `getMessage()`, `deleteInbox()`
- Auth: API key in constructor
- TypeScript types included

### R2: Python SDK (PyPI)
- Package: `ephemera`
- Class: `EphemeraClient` with same methods as JS
- Context manager support for auto-cleanup
- Type hints (Python 3.8+)

### R3: CLI Tool
- Package: `@ephemera/cli` (npm global install)
- Commands: `ephemera inbox create`, `ephemera inbox list`, `ephemera messages`
- Auth: `ephemera login` stores API key in `~/.ephemera/config.json`
- Interactive mode with inquirer

### R4: Webhook Dashboard
- UI: List webhooks with status, last triggered, success rate
- Logs: Expandable log entries with request/response
- Retry: Manual retry button for failed deliveries
- Test: Send test payload button

### R5: API Usage Analytics
- Metrics: Requests/day, top endpoints, error rates
- Storage: Aggregate in Redis, persist daily to PostgreSQL
- UI: Charts on Settings page

### R6: Bulk Operations API
- Endpoints: `POST /inboxes/bulk`, `DELETE /inboxes/bulk`
- Limits: Max 100 items per request
- Response: `{ success: [...], failed: [...] }`

## Architecture Decisions

### AD1: SDK Repository Structure
```
packages/
├── sdk-js/          # @ephemera/sdk
├── sdk-python/      # ephemera (PyPI)
└── cli/             # @ephemera/cli
```
- Monorepo in separate `ephemera-sdk` repository
- Or subdirectory `packages/` in main repo (simpler for now)

### AD2: SDK Code Generation
- Generate from OpenAPI spec for consistency
- Manual wrappers for ergonomic API
- Spec location: `services/api/openapi.yaml`

### AD3: Webhook Retry Strategy
- Exponential backoff: 1m, 5m, 15m, 1h, 6h (5 attempts max)
- Store retry state in WebhookLog
- Background job via BullMQ

### AD4: Analytics Storage
- Redis: `api:stats:{date}:{endpoint}` hash with count/errors
- Daily cron aggregates to `ApiUsageStats` table
- Retain 90 days

## Related Code Files
| File | Purpose |
|------|---------|
| `services/api/src/routes/webhooks.ts` | Existing webhook routes |
| `services/api/src/routes/inboxes.ts` | Add bulk endpoints |
| `services/api/src/services/webhookService.ts` | Add retry logic |
| `services/web/src/pages/Settings.tsx` | Add webhook dashboard tab |
| `services/api/src/middleware/analytics.ts` | New: request tracking |
| `packages/sdk-js/` | New: JavaScript SDK |
| `packages/sdk-python/` | New: Python SDK |
| `packages/cli/` | New: CLI tool |

## Implementation Steps

### Step 1: JavaScript SDK (4h)
1. Create `packages/sdk-js/`
   ```
   packages/sdk-js/
   ├── src/
   │   ├── index.ts
   │   ├── client.ts
   │   ├── types.ts
   │   └── errors.ts
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. Implement `client.ts`:
   ```typescript
   export class EphemeraClient {
     constructor(private apiKey: string, private baseUrl = 'https://api.ephemera.email') {}

     async createInbox(domain?: string): Promise<Inbox> { ... }
     async getInbox(id: string): Promise<Inbox> { ... }
     async listInboxes(): Promise<Inbox[]> { ... }
     async getMessages(inboxId: string): Promise<Message[]> { ... }
     async getMessage(id: string): Promise<Message> { ... }
     async deleteInbox(id: string): Promise<void> { ... }
   }
   ```

3. Add error classes with codes:
   ```typescript
   export class EphemeraError extends Error {
     constructor(message: string, public code: string, public status: number) {}
   }
   ```

4. Build with tsup, publish to npm

### Step 2: Python SDK (3h)
1. Create `packages/sdk-python/`
   ```
   packages/sdk-python/
   ├── ephemera/
   │   ├── __init__.py
   │   ├── client.py
   │   ├── models.py
   │   └── exceptions.py
   ├── pyproject.toml
   └── README.md
   ```

2. Implement `client.py`:
   ```python
   class EphemeraClient:
       def __init__(self, api_key: str, base_url: str = "https://api.ephemera.email"):
           self.api_key = api_key
           self.base_url = base_url

       def create_inbox(self, domain: str | None = None) -> Inbox: ...
       def get_messages(self, inbox_id: str) -> list[Message]: ...

       def __enter__(self): return self
       def __exit__(self, *args): pass  # Optional cleanup
   ```

3. Use `httpx` for async support, `pydantic` for models
4. Build with poetry, publish to PyPI

### Step 3: CLI Tool (3h)
1. Create `packages/cli/`
   ```
   packages/cli/
   ├── src/
   │   ├── index.ts
   │   ├── commands/
   │   │   ├── inbox.ts
   │   │   ├── messages.ts
   │   │   └── auth.ts
   │   └── utils/
   │       ├── config.ts
   │       └── output.ts
   ├── package.json
   └── README.md
   ```

2. Implement commands:
   ```typescript
   // inbox.ts
   program
     .command('inbox')
     .description('Manage inboxes')
     .command('create')
     .option('-d, --domain <domain>', 'Domain for inbox')
     .action(async (opts) => { ... });
   ```

3. Auth flow:
   - `ephemera login` prompts for API key
   - Stores in `~/.ephemera/config.json`
   - Validates key before saving

4. Use chalk for colors, ora for spinners, cli-table3 for tables

### Step 4: Webhook Dashboard UI (3h)
1. Create `services/web/src/components/webhook-dashboard.tsx`
   - Table: name, url, status, last triggered, success rate
   - Actions: edit, delete, test, view logs

2. Create `services/web/src/components/webhook-logs.tsx`
   - Expandable rows with request/response JSON
   - Status badges (success/failed)
   - Retry button for failed

3. Add tab to `Settings.tsx`:
   ```tsx
   <Tabs>
     <Tab label="Profile">...</Tab>
     <Tab label="API Keys">...</Tab>
     <Tab label="Webhooks"><WebhookDashboard /></Tab>
   </Tabs>
   ```

4. Add retry endpoint: `POST /webhooks/:id/logs/:logId/retry`

### Step 5: API Usage Analytics (2h)
1. Create middleware `services/api/src/middleware/analytics.ts`:
   ```typescript
   export async function analyticsMiddleware(request, reply) {
     const start = Date.now();
     reply.then(() => {
       const duration = Date.now() - start;
       const key = `api:stats:${today}:${request.routerPath}`;
       redis.hincrby(key, 'count', 1);
       if (reply.statusCode >= 400) redis.hincrby(key, 'errors', 1);
     });
   }
   ```

2. Create daily aggregation job in `services/api/src/jobs/aggregate-stats.ts`

3. Add analytics endpoint: `GET /analytics/usage` (admin only)

4. Add chart component to Admin page

### Step 6: Bulk Operations API (1h)
1. Add to `services/api/src/routes/inboxes.ts`:
   ```typescript
   app.post('/inboxes/bulk', { preHandler: app.authenticate }, async (req, reply) => {
     const { inboxes } = req.body; // Array of { localPart, domainId }
     if (inboxes.length > 100) return reply.status(400).send({ error: 'Max 100 items' });

     const results = await Promise.allSettled(
       inboxes.map(i => createInbox(user.id, i))
     );
     return {
       success: results.filter(r => r.status === 'fulfilled').map(r => r.value),
       failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
     };
   });
   ```

2. Add `DELETE /inboxes/bulk` with array of IDs

3. Update SDK methods to use bulk endpoints internally when array passed

## Success Criteria
- [ ] JS SDK: `npm install @ephemera/sdk` works, <30s to first API call
- [ ] Python SDK: `pip install ephemera` works, <30s to first API call
- [ ] CLI: `npx @ephemera/cli inbox create` creates inbox
- [ ] Webhook dashboard shows logs with retry functionality
- [ ] Analytics shows request counts per endpoint
- [ ] Bulk create 100 inboxes <5s

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SDK version drift | Medium | High | Generate from OpenAPI spec |
| npm/PyPI naming conflict | Low | Medium | Check availability first |
| Webhook retry storms | Low | High | Rate limit retries per webhook |
| Analytics storage bloat | Medium | Low | 90-day retention + aggregation |

## Security Considerations
- SDK: API key in memory only, warn if hardcoded
- CLI: Config file permissions 600
- Webhooks: HMAC signature verification required
- Analytics: No PII in metrics, aggregate only
- Bulk ops: Rate limit to prevent abuse

## Next Steps
After completion:
1. Publish SDK packages to npm/PyPI
2. Add SDK examples to documentation
3. Create "Getting Started" tutorial
4. Begin Phase 03 (Premium Features)
