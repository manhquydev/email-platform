# Ephemera: Product Overview & Development Requirements

## Executive Summary

**Ephemera** is a self-hosted, API-first, multi-domain disposable email platform designed for developers, businesses, and privacy-conscious users. It provides ephemeral inboxes, unlimited custom domains, comprehensive email management, real-time delivery, and seamless integration through REST APIs and SDKs.

**Status:** Production Ready (Beta)  
**Version:** 6.0+  
**Live:** https://app.manhquy.id.vn | https://api.manhquy.id.vn

---

## 1. Product Vision & Objectives

### Vision Statement
Enable users to manage unlimited disposable and custom domain emails with enterprise-grade reliability, security, and developer-friendly APIs—all self-hosted.

### Core Objectives
- Provide a reliable, fast, and secure email platform for temporary/disposable email use
- Offer unrestricted custom domain support with automatic DNS verification
- Ensure enterprise-grade security (encryption, 2FA, WebAuthn, RBAC)
- Deliver real-time email notifications via WebSocket/SSE
- Enable seamless automation through REST APIs and polyglot SDKs
- Support multiple authentication schemes (JWT, API Keys, Magic Links, Passkeys, OAuth, SSO)
- Provide subscription-based monetization with flexible tiers
- Maintain 99.9% uptime SLA with observability, backups, and disaster recovery

---

## 2. Target Users & Personas

### 2.1 Primary Personas

**Developer / API Consumer**
- Tech-savvy users integrating Ephemera into applications
- Needs: REST API, SDKs (JS/Python/Go/Java/PHP/.NET), webhook delivery, rate limits, API key management
- Use case: Automate inbox creation, message retrieval, forwarding rules

**Small Business Owner**
- Managing company emails with custom branding
- Needs: Custom domain support, team collaboration, attachment handling, professional UI
- Use case: Company email setup without expensive infrastructure

**Privacy-Conscious User**
- Wants control over email infrastructure
- Needs: Self-hosting option, zero data tracking, encryption, transparent operations
- Use case: Personal email with ephemeral inbox support

**System Administrator (Hosting Providers)**
- Managing multi-tenant email infrastructure
- Needs: Provider APIs, webhook integrations, billing automation, compliance features
- Use case: Offering managed Ephemera instances to customers

### 2.2 Secondary Users
- QA/Testing teams (disposable test inboxes)
- Freelancers organizing client communications
- Organizations with GDPR/compliance requirements

---

## 3. Core Features & Capabilities

### 3.1 Inbox Management
- **Unlimited Inboxes** - Create any number of ephemeral or custom-domain inboxes
- **Custom Domains** - Add own domains with DNS verification (SPF/DKIM/DMARC)
- **Anonymous Access** - Public ephemeral inboxes without authentication (/e/:token)
- **Inbox Sharing** - Team collaboration with role-based access
- **Labels & Organization** - Tag and categorize messages
- **Advanced Search** - Full-text search with filters (sender, date, subject)

### 3.2 Email Handling
- **SMTP Ingest** - Receive emails via standard SMTP protocol
- **Real-time Delivery** - WebSocket + SSE notifications (Redis pub/sub)
- **Attachment Support** - Download/preview attachments, size limits configurable
- **Message Retention** - Configurable TTL per inbox/user/tier
- **Soft Delete** - Recoverable message deletion with audit logging
- **Spam Filtering** - Rspamd integration, per-domain rules, ML-backed scoring

### 3.3 Email Sending (Outbound)
- **Forwarding Rules** - Multi-destination (Email/Webhook/Telegram/Discord)
- **Reply/Forward** - Send from managed inbox address
- **DKIM Signing** - Per-domain signature for deliverability
- **Provider Abstraction** - Support Postfix, SendGrid, Mailgun, Brevo, SES, Gmail
- **Bounce/Complaint Handling** - AWS SES integration for feedback loops

### 3.4 Authentication & Security
- **JWT Auth** - Stateless access tokens with expiry
- **API Keys** - Hashed, rate-limit-able credentials
- **2FA/TOTP** - RFC 6238 time-based OTP
- **WebAuthn/Passkeys** - FIDO2-compatible passwordless auth
- **Magic Links** - Email-based sign-in
- **OAuth2/OIDC** - Third-party provider SSO (GitHub, Google, Microsoft)
- **SAML** - Enterprise SSO (WIP)
- **Telegram Integration** - Bot for 2FA + notifications
- **Session Management** - Hardened with rotation, family tracking, multi-tab sync

### 3.5 Developer Experience
- **REST API** - OpenAPI 3.0 spec, comprehensive endpoints
- **SDKs** - JavaScript, Python, Go, Java, PHP, .NET, CLI
- **Webhooks** - Delivery with signature verification, retry logic
- **Rate Limiting** - Per-user, per-endpoint, with backoff headers
- **Sandbox Mode** - Test mode without production impact
- **Developer Portal** - API key management, webhook logs, quota tracking

### 3.6 Billing & Monetization
- **Subscription Tiers** - Freemium + 3 paid tiers (Basic, Pro, Enterprise)
- **Feature Parity** - Inbox count, storage, API calls, domain count gated by tier
- **Stripe Integration** - One-time & recurring payments
- **Redemption Codes** - Promotion codes, trial extensions
- **Usage Tracking** - Per-user quota enforcement
- **Billing Portal** - Invoice history, subscription management
- **SePay/VietQR** - Vietnamese payment support

### 3.7 Team & Collaboration
- **Organizations** - Group users and domains
- **Teams** - Inbox sharing with role-based permissions (Admin/Editor/Viewer)
- **Audit Logging** - Track all user actions for compliance
- **Invitations** - Share inboxes via email invites

### 3.8 Observability & Operations
- **Prometheus Metrics** - `/metrics` endpoint for monitoring
- **Grafana Dashboards** - Pre-built visualizations
- **Structured Logging** - Pino logs with correlation IDs
- **Health Checks** - `/health` and `/ready` endpoints
- **Backup & Restore** - Automated daily snapshots, multi-destination support
- **Alerting** - Configurable thresholds via Alertmanager

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **API Latency:** P95 < 200ms for reads, < 500ms for writes
- **SMTP Ingest:** < 5s from receipt to API availability
- **Database:** Optimized queries with connection pooling
- **Caching:** Redis for sessions, rate limits, job queues

### 4.2 Scalability
- **Horizontal:** Stateless API instances behind load balancer
- **Database:** PostgreSQL with read replicas, connection pooling
- **Queue:** BullMQ on Redis for async processing
- **Storage:** S3-compatible object storage for attachments

### 4.3 Security
- **Encryption:** AES-256-GCM for sensitive fields (secrets, API keys, TOTP)
- **TLS:** HTTPS everywhere, HSTS headers
- **SSRF Prevention:** Private IP blocking for webhook delivery
- **Injection Prevention:** Parameterized queries (Prisma), HTML sanitization (DOMPurify)
- **Rate Limiting:** Per-user, per-endpoint, configurable thresholds
- **CSRF Protection:** Token-based + SameSite cookies
- **Token Transport:** In-memory access tokens, httpOnly refresh cookies

### 4.4 Availability
- **Uptime SLA:** 99.9% (9 hours/month maintenance window)
- **Disaster Recovery:** RTO < 1 hour, RPO < 15 minutes
- **Multi-region:** K8s-ready for geo-redundancy (planned)

### 4.5 Compliance
- **GDPR:** Right to deletion, data portability, consent management
- **CCPA:** Opt-out support, transparency
- **Audit Logging:** All actions tracked with timestamps + user attribution
- **Data Residency:** Configurable bucket regions

---

## 5. Technical Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **API** | Fastify | v5 |
| **Language** | TypeScript | latest |
| **ORM** | Prisma | v5+ |
| **Database** | PostgreSQL | 14+ |
| **Cache/Queue** | Redis | 6+ |
| **Job Queue** | BullMQ | latest |
| **Frontend** | React | v19 |
| **Build** | Vite | v7 |
| **Styling** | Tailwind CSS | v3 |
| **Extension** | WXT | latest |
| **Mobile** | React Native + Expo | latest |
| **Reverse Proxy** | Caddy | latest |
| **Monitoring** | Prometheus + Grafana | latest |
| **Validation** | Zod | v3 |
| **Logging** | Pino | latest |
| **Payment** | Stripe | API v3+ |
| **Email Parser** | mailparser | latest |
| **SMTP Server** | Built-in + Postfix | latest |
| **Spam Filter** | Rspamd | latest |

---

## 6. Architecture Highlights

### Multi-Service Architecture
```
┌─ Caddy (Reverse Proxy + TLS)
├─ API (Fastify + TypeScript)
│  ├─ REST Endpoints
│  ├─ SMTP/IMAP/POP3 Servers
│  ├─ WebSocket Handler
│  └─ BullMQ Workers
├─ Web (React SPA + PWA)
├─ Extension (WXT + MV3)
├─ Mobile (React Native)
├─ PostgreSQL (Data)
├─ Redis (Cache/Queue)
└─ Prometheus + Grafana (Monitoring)
```

### Database Schema
- **Users & Orgs:** User, Profile, Organization, Team, Invitation
- **Email:** Domain, Inbox, Message, Attachment, Label
- **Rules:** MailForwardingRule, Filter, AbuseRule
- **Security:** ApiKey, Session, AuditLog, WebhookEvent
- **Billing:** Subscription, BillingEvent, RedemptionCode
- **Features:** OtpExtraction, DeliveryLog, Bounce, Complaint

### Real-time Flow
- **Primary:** WebSocket (Fastify ws plugin + Redis pub/sub)
- **Fallback:** Server-Sent Events (SSE) with opaque tickets
- **Pub/Sub:** Redis channels for multi-instance message propagation

---

## 7. Roadmap & Phases

### Completed (6.0+)
- [x] Core platform (multi-domain, inboxes, messages)
- [x] Authentication (JWT, 2FA, WebAuthn, OAuth, Magic Links)
- [x] Real-time delivery (WebSocket + SSE)
- [x] Forwarding rules (Email/Webhook/Telegram/Discord)
- [x] Browser extension (WXT, Chrome Side Panel)
- [x] Subscription tiers & billing (Stripe + SePay)
- [x] Team collaboration & RBAC
- [x] Email filters & labels
- [x] OTP extraction & AI summarization
- [x] Backup & disaster recovery

### In Progress (WIP)
- [ ] Mobile app (React Native + Expo)
- [ ] SAML/OIDC/LDAP enterprise SSO
- [ ] Multi-region K8s deployment
- [ ] DLP/compliance framework

### Planned (Future)
- [ ] Advanced analytics & reporting
- [ ] Custom branding / white-label
- [ ] API usage quotas per tier
- [ ] Scheduled email sending
- [ ] Calendar/contact sync (CalDAV/CardDAV)
- [ ] AI-powered email classification

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| API P95 Latency | < 200ms |
| SMTP Ingest P95 | < 5s |
| Uptime SLA | 99.9% |
| Test Coverage | > 80% |
| Security Audit | Annual + incident response |
| User Growth | 50% YoY |
| Churn Rate | < 5% monthly |
| NPS | > 40 |

---

## 9. Constraints & Dependencies

### External Dependencies
- **Stripe API** - Payment processing (required for billing)
- **AWS SES** - Outbound email + bounce/complaint feedback
- **Google Gemini** - AI email summarization (tier-gated)
- **Let's Encrypt** - TLS certificates (via Caddy)

### Infrastructure Constraints
- Minimum: 2 CPU, 2 GB RAM (single instance)
- Recommended: 4 CPU, 4 GB RAM, HA setup (3+ replicas)
- PostgreSQL: 20 connection pool, WAL backups

### Known Limitations
- IMAP/POP3 planned but not yet available
- CalDAV/CardDAV future goal (stretch)
- Single-region deployment in MVP (K8s multi-region planned)

---

## 10. References

- **GitHub:** https://github.com/manhquydev/email-platform
- **Documentation:** https://docs.manhquy.id.vn (WIP)
- **API Docs:** OpenAPI schema at `/docs`
- **Provider Docs:** `/docs/provider-api/README.md`
