# Ephemera Email Platform: System Architecture

## 1. Service Topology

```
                              ┌──────────────────────────────────────────────────┐
                              │                   INTERNET                        │
                              └──────────────────────────────────────────────────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                    Port 80/443          Port 25/2525
                                          │                   │
                              ┌───────────┴───────────┐       │
                              │        CADDY          │       │
                              │   (Reverse Proxy)     │       │
                              │   - Auto HTTPS        │       │
                              │   - Security Headers  │       │
                              └───────────┬───────────┘       │
                                          │                   │
              ┌───────────────────────────┼───────────────────┼───────────────┐
              │                           │                   │               │
    ┌─────────┴─────────┐     ┌──────────┴──────────┐       │    ┌──────────┴──────────┐
    │   WEB (React)     │     │   API (Fastify)     │◄──────┘    │     GRAFANA         │
    │   Port 80         │     │   Port 3001         │            │     Port 3000       │
    │   - SPA Frontend  │     │   - REST Endpoints  │            │   - Dashboards      │
    │   - Vite Build    │     │   - SMTP Server     │            │   - Metrics Viz     │
    └─────────┬─────────┘     │   - Workers         │            └─────────────────────┘
              │               │   - Cron Jobs       │                      │
              │               └──────────┬──────────┘                      │
              │                          │                                 │
              │                          │           ┌─────────────────────┴──────────┐
              │                          │           │       BROWSER EXTENSION        │
              └──────────────────────────┼──────────►│   (WXT Framework)              │
                                         │           │   - Side Panel (Chrome API)    │
                                         │           │   - Background SW (Push)       │
                                         │           └────────────────────────────────┘
                                         │
         ┌───────────────────────────────┼─────────────────────────────────┤
         │                               │                                 │
┌────────┴────────┐           ┌─────────┴─────────┐           ┌───────────┴───────────┐
│   POSTGRESQL    │           │      REDIS        │           │     PROMETHEUS        │
│   Port 5432     │           │   Port 6379       │           │     Port 9090         │
│   - User Data   │           │   - Sessions      │           │   - Metrics Store     │
│   - Messages    │           │   - Job Queues    │           │   - Scrape API        │
│   - Domains     │           │   - Rate Limits   │           └───────────────────────┘
└─────────────────┘           └───────────────────┘
```

## 2. Data Flow

### 2.1 Inbound Email Flow
```
External Mail Server
        │
        ▼
  SMTP Server (Port 2525)
        │
        ▼
  Parse Email (mailparser)
        │
        ├──► Spam Check
        │
        ├──► Virus Scan (if enabled)
        │
        ├──► Apply Rules/Filters
        │
        ▼
  Store in PostgreSQL
        │
        ├──► Attachments → Disk/S3
        │
        ├──► Trigger Webhooks
        │
        └──► Send Telegram Notification
```

### 2.2 API Request Flow
```
Client Request
        │
        ▼
  Caddy (TLS Termination)
        │
        ▼
  Fastify Server
        │
        ├──► Rate Limiter
        │
        ├──► JWT/API Key Auth
        │
        ├──► Zod Validation
        │
        ├──► Route Handler
        │
        ▼
  Business Logic
        │
        ├──► Prisma (Database)
        │
        ├──► External Services
        │    (Stripe, Telegram)
        │
        ▼
  JSON Response
```

## 3. Authentication Flow

### 3.1 Password Login
```
1. POST /auth/login { email, password, rememberMe? }
2. Verify password hash (bcrypt)
3. If 2FA enabled:
   a. Return { requires2FA: true, tempToken }
   b. POST /auth/2fa/verify { tempToken, code }
4. Generate JWT with { userId, role, tier }
5. Set refresh token as httpOnly cookie (7 days default, 30 days if rememberMe)
6. Return { token, user }
```

### 3.2 API Key Authentication
```
1. Request with X-API-KEY header
2. Hash the key
3. Lookup in ApiKey table
4. Update lastUsedAt
5. Populate request.user from linked User
```

### 3.3 Magic Link Flow
```
1. POST /auth/magic-link { email }
2. Generate token, store in MagicLinkToken
3. Send email with link to /auth/magic-link/:token
4. User clicks link
5. Validate token, generate JWT
6. Return { token, user }
```

### 3.4 Token Refresh (Rotation)
```
1. POST /auth/refresh { refreshToken }
2. Verify refresh token & check for reuse detection
3. If valid, rotate token:
   a. Revoke current refresh token
   b. Generate new JWT (Access Token)
   c. Generate new Refresh Token (Family Rotation)
4. Record audit log entry via recordAuditFromRequest
5. Return { token, refreshToken, expiresIn }
```

### 3.5 Client-Side Session Management
The `AuthContext` in the web service manages the lifecycle of the authentication session:

- **Single Initialization**: `initAuth` useEffect runs exactly once on mount via `hasInitialized` ref, preventing duplicate `/auth/me` calls on token refresh cycles.
- **Background Refresh**: A background timer triggers a token refresh every 10 minutes to maintain active sessions.
- **Visibility Awareness**: Uses the Page Visibility API to pause refresh timers when the tab is hidden, reducing unnecessary API calls and battery drain.
- **Session Wake-up**: If a tab remains hidden for more than 15 minutes, it triggers an immediate refresh upon becoming visible to ensure the token hasn't expired.
- **Multi-tab Synchronization**: Uses `BroadcastChannel` ('auth_session_sync') to synchronize authentication state across all open tabs — logout in one tab redirects all other tabs to `/login`.
- **State Tracking**: Exposes `isAuthenticated` boolean for efficient UI conditional rendering without manually checking token presence.
- **Expiry Redirect**: When a session expires (401 from API interceptor), dispatches `auth:unauthorized` event; `AuthContext` handles cleanup and redirects to `/login?reason=expired`.
- **Expired Session UX**: Login page reads `?reason=expired` query param and shows a `toast.error` notification so users understand why they were redirected.
- **Remember Me**: Login page "Ghi nhớ đăng nhớ (30 ngày)" checkbox extends refresh token cookie TTL from 7 days to 30 days server-side.
- **SSO Security**: SSO redirect URL no longer embeds refresh token; token is set as httpOnly cookie server-side before the redirect.
- **localStorage Consistency**: All login flows (password, Passkey, Telegram) write `accessToken` key to match `tokenManager.getAccessToken()`.

### 3.6 Session Logout Flow
```
1. User clicks logout (any surface: AppHeader, NavigationSidebar, DesktopNav,
   HamburgerMenu, GeneralSettings)
2. logout('manual') called on AuthContext
3. Access token cleared from localStorage
4. Refresh token cookie cleared (server-side via POST /auth/logout)
5. BroadcastChannel publishes logout event to all open tabs
6. All tabs redirect to /login
```

## 4. Email Ingestion Flow

### 4.1 SMTP Server
The SMTP server listens on port 2525 and processes incoming emails:

```typescript
// Simplified flow from smtp.ts
1. Connection received
2. Parse MAIL FROM and RCPT TO
3. Receive DATA (email content)
4. Parse with mailparser
5. Extract: from, to, subject, body, attachments
6. Lookup inbox by localPart@domain
7. Create Message record
8. Store attachments to disk/S3
9. Apply forwarding rules
10. Trigger webhooks
11. Send Telegram notification (if linked)
```

### 4.2 Auto Domain Creation
When `ALLOW_AUTO_DOMAIN_CREATION=true`:
- Domains are created automatically when email arrives
- Inboxes are created for unknown recipients
- Useful for development, disabled in production

## 5. Integration Points

### 5.1 Stripe Integration
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────►│ API Server   │────►│   Stripe    │
│             │◄────│              │◄────│             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    Webhook Handler
                    /billing/webhook
```

**Endpoints:**
- `POST /billing/checkout` - Create Stripe checkout session
- `POST /billing/portal` - Create customer portal session
- `POST /billing/webhook` - Handle Stripe events

### 5.2 Telegram Integration
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────►│ Telegram Bot │────►│   API       │
│   Chat      │◄────│   API        │◄────│   Server    │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Commands:**
- `/start` - Initialize bot interaction
- `/link <token>` - Link Telegram to account
- `/settings` - Manage notification preferences
- `/unlink` - Unlink account

### 5.3 Outbound Email
```
API Server
    │
    ├──► Primary: SMTP Server
    │    (OUTBOUND_SMTP_*)
    │
    └──► Fallback: Gmail API
         (Google OAuth2)
```

### 5.4 Hosting Provider Integration (cPanel/WHMCS)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Hosting   │────►│  API Server  │────►│ Webhook     │
│   Platform  │◄────│              │◄────│ Endpoint    │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Authentication:** `X-Provider-Key` header (SHA-256 hashed API Key)

**Capabilities:**
- **Tenant Management:** Create/suspend isolated tenants
- **Domain Provisioning:** Programmatic domain verification
- **Mailbox Control:** Create/delete mailboxes for tenants
- **Event Webhooks:** Real-time updates (tenant.created, mailbox.deleted)

**Key Endpoints:**
- `POST /v1/provider/tenants`
- `POST /v1/provider/tenants/:id/domains`
- `POST /v1/provider/tenants/:id/mailboxes`

## 6. Docker Services

| Service    | Port  | Purpose                        |
|------------|-------|--------------------------------|
| postgres   | 5432  | Primary database               |
| redis      | 6379  | Caching, job queues            |
| api        | 3001  | Backend API + SMTP             |
| web        | 80    | Frontend SPA                   |
| caddy      | 80,443| Reverse proxy, TLS             |
| prometheus | 9090  | Metrics collection             |
| grafana    | 3000  | Metrics visualization          |
| mailpit    | 1025  | Dev email testing              |

## 7. Configuration Overview

### Critical Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=<32+ char secret>
TOTP_ENCRYPTION_KEY=<32 byte hex>

# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMTP
OUTBOUND_SMTP_HOST=smtp.provider.com
OUTBOUND_SMTP_PORT=587
OUTBOUND_SMTP_USER=user
OUTBOUND_SMTP_PASS=pass

# Features
ALLOW_AUTO_DOMAIN_CREATION=false
PUBLIC_INBOX_ENABLED=false
REQUIRE_EMAIL_VERIFICATION=true
```

## 8. Frontend UI Architecture

### Phase 1: Glassmorphism Visual Redesign (Completed)
**Objective:** Transform email list from flat UI to frosted glass cards

**Implementation:**
- **EmailItem Component**: Refactored from flat list to card-based layout
  - Base: 10px backdrop blur with subtle borders
  - Unread: Gradient overlay + 4px left accent (primary color)
  - Hover: Scale 1.02 + lift effect (transform + shadow transition)
  - Selected: Gradient fill + inset glow shadow

**Design Tokens** (Tailwind utilities):
```css
.glass → 10px blur, 50% opacity elevated bg
.glass-elevated → 12px blur + md shadow
.glass-unread → gradient + left border accent
.glass-hover → 14px blur on hover + lg shadow
```

**Browser Support:**
- Modern: `backdrop-filter: blur()`
- Safari: `-webkit-backdrop-filter` prefixes
- Legacy (IE11, old Firefox): Solid RGBA fallbacks via `@supports not`

**Performance:**
- Target: 60fps animations
- Transitions: `duration-200` (0.2s cubic-bezier)
- GPU acceleration: `transform` + `backdrop-filter`

**Files Modified:**
- `services/web/tailwind.config.js` (lines 162-188: glass utilities plugin)
- `services/web/src/components/EmailItem.tsx` (card-based structure)
- `services/web/src/index.css` (lines 16-32: @supports fallbacks)
- `services/web/src/components/EmailStream.tsx` (removed list wrapper styles)

## 8. Security Utilities

A set of shared security utilities enforce defense-in-depth across the platform:

### Outbound Network Security: `ssrf-safe-fetch.ts`
- **SSRF Protection**: Blocks requests to private/loopback/link-local IPs and cloud metadata endpoints
- **Protocol Lock**: HTTPS-only; rejects HTTP schemes
- **Port Allowlist**: Restricts to safe ports (443 for HTTPS, configurable via `SAFE_FETCH_ALLOWED_PORTS`)
- **Redirect Hardening**: Refuses all redirects
- **Usage**: Webhook delivery and any user-controlled outbound HTTP

### At-Rest Field Encryption: `field-encryptor.ts`
- **Algorithm**: AES-256-GCM via `encryption.ts`
- **Envelope Format**: `fenc:v1:{encryptedBase64}` prefix for version tracking
- **Idempotent Migration**: `encryptIfNeeded()` prevents double-encryption
- **Encrypted Fields**:
  - `Webhook.secret`
  - `ForwardingRule.webhookSecret`
  - `HostingProvider.webhookSecret`
  - DKIM private keys and TOTP secrets (existing)

### Path Traversal Containment: `path-validation.ts`
- **Validation**: `validatePathWithin(userPath, baseDir)` ensures path stays within container
- **Usage**: Backup download/delete operations, maildir synchronization

### CAPTCHA Verification: `captcha-verifier.ts`
- **Providers**: Turnstile or hCaptcha (configurable)
- **Integration**: Per-endpoint opt-in challenge-response
- **Verification**: Server-side token validation before proceeding

### Brute-Force Mitigation: `auth-attempt-limiter.ts`
- **Mechanism**: Sliding window rate limiter (Redis + memory fallback)
- **Coverage**: SMTP LOGIN, IMAP LOGIN attempts
- **Policy**: Configurable threshold (default: 5 attempts / 15 minutes)
- **Lockout**: Temporary ban; logged for audit

### SSE Security: `sse-ticket.ts`
- **Single-Use Auth**: 60-second opaque tickets (no tokens in URLs)
- **Transport**: `GET /events?ticket=XXX` exchanges ticket for EventSource connection
- **Replacement**: Eliminates token-in-URL risk for Server-Sent Events

### Token Transport & Storage
- **Access Token**: In-memory, cleared on page unload (never persisted)
- **Refresh Token**: httpOnly, secure, SameSite=Strict cookie only (not in URL/localStorage)
- **Token Manager** (`token-manager.ts`): Shared API for accessing current token; cross-tab sync via BroadcastChannel
- **CSRF Token**: Parent-domain cookie + localStorage fallback (prevents CSRF in iframe contexts)
- **Session Lifecycle**:
  - Password login, SSO, magic-link, and Telegram flows all establish httpOnly refresh tokens
  - Token revocation is **fail-closed** by default (`TOKEN_REVOCATION_FAIL_CLOSED=true`): if revocation store is unavailable, logins are rejected rather than allowed

## 9. Scalability Considerations

### Current Architecture
- Single API instance handles HTTP + SMTP
- PostgreSQL for persistence
- Redis for caching and queues
- Stateless API allows horizontal scaling

### Future Scaling
- Separate SMTP server for high-volume email
- Read replicas for PostgreSQL
- Redis cluster for session/cache
- CDN for frontend assets
- Message queue for async processing
