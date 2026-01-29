# Scout Report: API & Webhook Fixes

## Analysis Summary
Found all relevant files for the 4 requested issues. The codebase uses Fastify with Prisma. Webhook logic is split between routes (management) and a worker (delivery).

## 1. Raw Body Parsing (server.ts)
**Location**: `services/api/src/server.ts`
**Issue**: Lines 110-115 are commented out.
**Fix**: Uncomment and ensure `fastify-raw-body` is configured correctly. This is likely required for Stripe/SePay signature verification.

## 2. SePay Dev Bypass (sepay.service.ts)
**Location**: `services/api/src/services/sepay.service.ts`
**Issue**: Lines 103-106 allow bypassing signature verification if `secretKey` is missing, without checking environment.
**Fix**: Add `&& process.env.NODE_ENV !== 'production'` to the condition.

## 3. Duplicate SSRF Check
**Duplicate Logic**: `isInternalUrl` function (checks private IPs, localhost, kube-dns).
**Locations**:
- `services/api/src/routes/webhooks.ts` (Lines 8-44)
- `services/api/src/webhookWorker.ts` (Lines 7-43)
**Fix**: Extract to `services/api/src/utils/network.ts`.

## 4. Missing email.forwarded Event
**Location**: `services/api/src/services/webhookService.ts`
**Action**:
- Add `'email.forwarded': 'Triggered when an email is forwarded'` to `WEBHOOK_EVENTS`.
- **Note**: Need to verify where forwarding logic resides to implement the *trigger*. Likely in `services/api/src/services/forwarding/destinations/webhook-destination.ts` or similar (observed in file list).

## File List
### Modify
- `services/api/src/server.ts`
- `services/api/src/services/sepay.service.ts`
- `services/api/src/routes/webhooks.ts`
- `services/api/src/webhookWorker.ts`
- `services/api/src/services/webhookService.ts`

### Create
- `services/api/src/utils/network.ts` (Shared SSRF logic)

### Patterns & Utilities
- **SSRF**: Strict blocking of Private IPs (10.x, 172.16+, 192.168.x), Loopback, and internal K8s domains (.local, .internal).
- **Env Checks**: Use `process.env.NODE_ENV` (or `isProduction` var in server.ts).
- **Fastify**: Plugin registration pattern in `buildServer`.

## Unresolved Questions
- Does `email.forwarded` need a specific payload structure different from `email.received`? (Assume similar for now).

