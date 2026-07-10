# Ephemera: Codebase Summary

## Directory Structure

```
email-platform/
├── .claude/              # Claude Code configuration & hooks
├── .agent/              # Agent system prompts & skills
├── services/
│   ├── api/             # Backend API (Node.js + Fastify v5)
│   ├── web/             # Frontend (React 19 + Vite 7)
│   ├── extension/       # Browser extension (WXT + MV3)
│   ├── mobile/          # Mobile app (React Native + Expo)
│   ├── dovecot/         # IMAP/LMTP server
│   ├── postfix/         # SMTP MTA
│   ├── rspamd/          # Spam/virus filter
│   └── observability/   # Prometheus + Grafana
├── packages/            # Shared SDKs (JS, Python, Go, Java, PHP, .NET)
├── plugins/             # Hosting provider plugins (cPanel, DirectAdmin, Plesk)
├── docs/                # Documentation
├── plans/               # Development plans & reports
├── docker-compose.yml   # Development stack
└── docker-compose.prod.yml  # Production stack
```

## Service Overview

| Service | Tech | LOC | Purpose |
|---------|------|-----|---------|
| **services/api** | Fastify v5, TypeScript | ~37,500 | Core API, SMTP/IMAP/POP3/WebDAV servers, workers, cron jobs |
| **services/web** | React 19, Vite 7, Tailwind | ~48,200 | SPA frontend, PWA, i18n, real-time updates |
| **services/extension** | WXT, React, MV3 | ~7,300 | Chrome/Firefox/Safari extension, Side Panel, push handler |
| **services/mobile** | React Native, Expo | ~5,000 | iOS/Android app, offline sync, biometric auth |
| **sdk-js** | TypeScript | ~2,000 | Universal JS/Node.js SDK |
| **sdk-python** | Python | ~1,500 | Sync + async Python client |
| **sdk-go** | Go | ~1,200 | Go client library |
| **plugins/cpanel** | Perl | ~800 | cPanel WHM provisioning |

**Total: ~105,500 LOC**

## Key Packages & Dependencies

### Backend (services/api)
- **Fastify v5** - HTTP server framework
- **Prisma** - ORM with 46 migrations
- **PostgreSQL** - Primary database
- **Redis** - Sessions, job queues, rate limiting (ioredis)
- **BullMQ** - Job queue system (email, outbound, webhooks)
- **Zod** - Schema validation
- **JWT** - Authentication (jsonwebtoken)
- **WebAuthn** - Passkey support (@simplewebauthn/server)
- **TOTP** - MFA (otplib)
- **AES-GCM** - Field encryption (crypto built-in)
- **Stripe** - Payment processing
- **AWS SDK** - S3 + SES integration
- **Nodemailer** - SMTP client
- **mailparser** - Email parsing
- **Gemini API** - AI summarization
- **Pino** - Structured logging

### Frontend (services/web)
- **React 19** - UI framework
- **Vite 7** - Build tool
- **React Router v7** - Routing
- **TanStack Query v5** - Data fetching & caching
- **Tailwind CSS v3** - Styling + custom glassmorphism utilities
- **Tiptap v3** - Rich text editor
- **Framer Motion** - Animations
- **i18next** - Localization (EN/VI)
- **Zustand/Context API** - State management
- **TypeScript** - Type safety

### Browser Extension
- **WXT** - Extension framework
- **React** - UI components
- **TypeScript** - Type safety
- **Manifest v3** - Latest Chrome spec
- **Chrome Storage API** - Data persistence
- **Chrome Alarms API** - Background tasks
- **Web Push API** - Notifications

## Repository Statistics

- **Total Files:** 1,706
- **Total Tokens:** 5.9M
- **Total Chars:** 24.5M
- **Production Ready:** Yes (beta)
- **Test Coverage:** Vitest tests in all major services

## Key Code Patterns

### Backend
- **Route Structure:** `services/api/src/routes/` (74 files)
  - Auth, inboxes, messages, domains, webhooks, billing, teams, orgs, SCIM, admin
  - REST endpoints with Zod validation
  - Middleware-based RBAC (role-based access control)

- **Services:** `services/api/src/services/` (83 files)
  - Email provider factory (Brevo, Mailgun, SendGrid, SES, SMTP, Postfix)
  - Forwarding engines (Email/Webhook/Telegram/Discord)
  - Billing & tier enforcement
  - WebAuthn, DKIM, AI summarization

- **SMTP/IMAP/POP3 Servers:** Built-in protocol handlers
  - SMTP ingest on port 2525
  - IMAP/LMTP for Dovecot integration
  - POP3/WebDAV support

- **Workers:** BullMQ-based async processing
  - Email delivery
  - Outbound mail
  - Webhook delivery
  - Scheduled tasks

### Frontend
- **Page Structure:** ~55 pages organized by feature
  - Public pages (landing, pricing, features)
  - Auth pages (login, register, SSO, passkeys)
  - Protected routes (/app/*, /settings/*, /admin/*)
  - Focus dashboard for quick email access
  - Inbox workspace with search/filters
  - Settings, domains, forwarding, developer portal

- **Components:** ~377 files (18.2K LOC)
  - Reusable UI components
  - Feature-specific components
  - Error boundaries & skeleton loaders
  - Glassmorphism design system

- **PWA Support:**
  - Service worker (sw.js, push-sw.js)
  - vite-plugin-pwa + Workbox
  - Offline capability
  - Install prompts

- **Real-time:**
  - WebSocket connections (primary)
  - SSE fallback
  - Redis pub/sub for multi-instance sync

## Database Schema (Prisma)

**Core Models:**
- User, Profile, Session, ApiKey
- Domain, Inbox, Message, Attachment
- MailForwardingRule, Filter, Label, Team, Invitation
- Subscription, BillingEvent, WebhookEvent
- AbuseReport, AbuseRule, AuditLog
- OtpExtraction, DeliveryLog, Bounce, Complaint

**Relationships:**
- User ↔ Domain, Inbox, Team, Subscription
- Inbox ↔ Message, Label, Filter, MailForwardingRule
- Message ↔ Attachment

## Testing

- **Framework:** Vitest
- **Location:** `src/test/` (55+ files in api), `__tests__/` in web
- **Coverage Areas:** Auth, API routes, email processing, DB operations
- **E2E:** Playwright tests in extension (79 tests)

## Observability

- **Metrics:** Prometheus format from `/metrics`
- **Dashboard:** Grafana (included in docker-compose)
- **Logs:** Pino structured logging → Loki/ELK optional
- **Health Checks:** `/health` (always public), `/ready` (DB connectivity)

## Deployment

- **Docker:** `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod)
- **K8s:** Kustomize configs in `k8s/` with 3-replica API deployment
- **Reverse Proxy:** Caddy (auto-TLS, security headers)
- **Backup:** Automated snapshot system (Postgres, Redis, S3)

## WIP Features

- SAML/OIDC/LDAP integration (`src/_wip/` stubs)
- Mobile app completion
- Multi-region K8s setup
- DLP/compliance framework

## Notes

- Monorepo structure with independent services
- TypeScript strict mode across codebase
- Security-first design (encryption, input validation, rate limiting)
- Extensible provider model for outbound email
- Multi-tenancy support via tenant context middleware
