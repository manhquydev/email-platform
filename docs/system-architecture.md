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
1. POST /auth/login { email, password }
2. Verify password hash (bcrypt)
3. If 2FA enabled:
   a. Return { requires2FA: true, tempToken }
   b. POST /auth/2fa/verify { tempToken, code }
4. Generate JWT with { userId, role, tier }
5. Return { token, user }
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

## 8. Scalability Considerations

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
