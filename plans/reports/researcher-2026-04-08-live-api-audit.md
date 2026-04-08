# Live API Audit Report
Date: 2026-04-08 (Asia/Saigon)
Scope: `https://app.manhquy.click/api`, `https://api.manhquy.click`
Method: live HTTP probing (GET/POST), Swagger discovery, sample probes by endpoint groups.

## 1) Entrypoint check
- `GET https://app.manhquy.click/api` -> `200`, `text/html` (SPA HTML), not JSON API root.
- `GET https://app.manhquy.click/api/health` -> `404`, body: `{"message":"Route GET:/api/health not found",...}`.
- `GET https://api.manhquy.click` -> `404`, body: `{"message":"Route GET:/ not found",...}`.
- `GET https://api.manhquy.click/health` -> `200`, body: `{"ok":true,"status":"ok",...}`.

## 2) Discoverable endpoints
- `GET https://api.manhquy.click/docs` -> `200` (Swagger UI).
- `GET https://api.manhquy.click/docs/json` -> `200` (OpenAPI JSON).
- OpenAPI stats:
  - Total paths: `311`
  - `components.schemas`: `0` (empty)
  - Declared response codes across spec: only `200`
  - `servers`: `http://localhost:3001` (dev server in live spec)

## 3) Probe sample endpoints by group
### health / ready / metrics
- `GET /health` -> `200`, JSON `ok/status/service/timestamp`
- `GET /ready` -> `200`, JSON includes `database/redis/smtp`
- `GET /metrics` -> `200`, Prometheus text

### auth
- `POST /auth/login` (invalid creds) -> `401`, `{"error":"Invalid credentials"}`
- `GET /auth/me` (no token) -> `401`, `{"error":"Unauthorized","details":"No Authorization..."}`
- `POST /auth/anonymous` -> `200`, returns `accountCode/visitorToken/accessToken`
- `GET /auth/anonymous/me` (anon token) -> `200`

### domains
- `GET /domains` (no token) -> `401`
- `GET /domains` (anon token) -> `200`, returns domain list incl. fields: `verificationToken`, `ownerId`, `owner.email`

### inboxes
- `GET /inboxes` (no token) -> `401`
- `GET /inboxes` (anon token) -> `401` (`{"error":"Unauthorized"}`)
- `POST /public/inboxes` -> `404`, `{"error":"Public inbox creation disabled"}`

### messages
- `GET /messages` (no token) -> `401`
- `GET /messages` (anon token) -> `400`, `{"error":"Invalid request"}`
- `GET /api/public/inbox/nobody@example.com/messages` -> `404`, `{"error":"Inbox not found"}`

### attachments
- `GET /attachments/{id}/download` (no token) -> `401`
- `GET /api/public/attachments/{id}/download` -> `404`, `{"error":"Attachment not found"}`

### abuse / admin
- `GET /abuse/rules` (no token) -> `401`
- `POST /abuse/reports` (`{}`) -> `400`, field validation error (`reason required`)
- `GET /admin/users` (no token) -> `401`
- `GET /admin/users` (anon token) -> `403`, `{"error":"Admin access required"}`

## 4) Findings: signs backend incomplete / bad contract
| Severity | Finding | Evidence | Practical impact | Short fix |
|---|---|---|---|---|
| Critical | Entrypoint `app.manhquy.click/api` is not a usable API base | `GET /api` returns HTML; `/api/*` route probes return `Route ... not found` | Any client/integration using this advertised entrypoint fails hard (404/non-API payload) | Make `app` reverse-proxy `/api/*` to `api` with path rewrite OR remove/publicly deprecate this entrypoint and enforce single API base URL |
| High | OpenAPI contract is largely non-actionable (empty schema + only 200 responses + localhost server) | `/docs/json`: `components.schemas={}`, all ops `responses: {200: Default Response}`, `servers=http://localhost:3001` | SDK generation, contract testing, and integration reliability are broken; UI may look complete but contract is effectively placeholder | Generate spec from real DTO/Zod schemas; include requestBody/errors (400/401/403/404/422/500); set prod server URL |
| High | Potential data exposure on `/domains` for anonymous token | `GET /domains` with anonymous token returns `verificationToken`, `ownerId`, `owner.email` | Leaks owner metadata and verification token details to unauthenticated/anonymous context | Redact sensitive fields for anon/public consumers; split endpoint into public-safe projection vs owner/admin projection |
| Medium | Error contract inconsistent across endpoints | Seen mixed envelopes: `{message,error,statusCode}`, `{error,details}`, `{error:true,message,code}`, `{error:"Inbox not found"}` | Frontend/client error handling is brittle; hard to build stable SDK | Standardize error envelope (e.g. `code/message/details/requestId`) and document per status code |
| Medium | Status code semantics inconsistent (`404` used for feature toggle/business state) | `POST /public/inboxes` returns `404` with message `Public inbox creation disabled` | Monitoring and client logic misclassify feature-disabled as route missing | Use `403`/`409` for feature disabled; reserve `404` for missing resource/route |
| Low | Runtime/auth behavior diverges from README statement | README says all except `/health` require auth, but `/ready` and `/metrics` are public `200` | Confusion for ops and security assumptions | Sync docs with runtime policy or protect `/ready` and `/metrics` behind auth/IP allowlist |

## 5) Overall completion signal (backend vs UI)
- Backend is real and partially functional on `api.manhquy.click` (health, auth, abuse validation, protected admin).
- But contract quality is weak (OpenAPI placeholder-like), and one advertised entrypoint (`app.../api`) is effectively broken for API consumers.
- No clear “fake 200 success” found in sampled endpoints; main risks are routing mismatch, contract drift, and inconsistent error semantics.

## Unresolved questions
1. `https://app.manhquy.click/api` was intended as official API gateway or just SPA route?
2. Is exposing `owner.email` and `verificationToken` in `/domains` for anonymous users intentional product behavior?
3. Should `/metrics` and `/ready` be publicly accessible in production?
4. Is `POST /public/inboxes` expected disabled-by-config now, or should it be enabled for public flow?
