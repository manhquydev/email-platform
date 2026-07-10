# Ephemera: Project Roadmap

**Last Updated:** 2026-07-10  
**Current Version:** 6.0+  
**Status:** Production Beta  
**Overall Completion:** 97%

---

## Executive Summary

Ephemera has achieved feature parity for core platform functionality (email ingestion, management, delivery, auth, billing, team collaboration, observability). All critical systems are production-ready. Current focus: mobile app completion, enterprise SSO integration (SAML/OIDC), multi-region K8s setup, and compliance framework.

---

## Completed Phases

### Phase 1: Core Platform Foundation ✅
**Completed:** Q4 2025  
**Status:** 100%

- [x] Multi-domain support with DNS verification (SPF/DKIM/DMARC)
- [x] SMTP ingest server (Postfix + built-in handlers)
- [x] RESTful API (Fastify v5 + TypeScript)
- [x] JWT authentication with token rotation
- [x] Basic Web UI (React 19 + Vite)
- [x] Docker-based deployment (docker-compose)
- [x] PostgreSQL + Prisma ORM
- [x] Redis for caching + sessions
- [x] Inbox CRUD operations
- [x] Message storage + retrieval
- [x] Attachment handling (disk/S3)

---

### Phase 2: User Experience & Real-time ✅
**Completed:** Q4 2025  
**Status:** 100%

- [x] Real-time email delivery (WebSocket + SSE fallback)
- [x] UI redesign (glassmorphism design system)
- [x] Attachment preview + download
- [x] Search + pagination for messages
- [x] OAuth2 token refresh (automatic, multi-tab sync)
- [x] Session management hardening
  - Token family tracking for reuse detection
  - Opaque refresh tokens (httpOnly cookies)
  - Multi-tab race condition prevention
  - Remember Me (30-day TTL)
  - Session expiry redirect UX
- [x] CSRF protection (shared-cookie + token model)
- [x] Security audit + remediation

---

### Phase 3: Browser Extension - Stabilization ✅
**Completed:** 2026-01-17  
**Status:** 100%

- [x] Migrate to WXT framework
- [x] Chrome Side Panel API integration
- [x] Content Security Policy (CSP) hardening
- [x] Unit tests (79 tests covering core flows)
- [x] E2E tests (Playwright)
- [x] Internationalization (EN/VI)
- [x] Chrome/Firefox/Safari MV3 support
- [x] OTP watcher + auto-copy
- [x] Push notification handler
- [x] Global search across inboxes
- [x] Store submission preparation

---

### Phase 4: Power User Features ✅
**Completed:** 2026-01-17  
**Status:** 100%

- [x] Enhanced forwarding rules engine
  - Email, Webhook, Telegram, Discord destinations
  - Conditional routing (sender regex)
  - Multi-destination support
- [x] OTP auto-extractor with confidence scoring
- [x] Webhook notifications (MailHook pattern)
  - HMAC-SHA256 signing
  - Retry logic with exponential backoff
  - Delivery tracking
- [x] Outbound email with DKIM signing
- [x] Reply/Forward from inbox address
- [x] Message filtering system
- [x] Spam score display (Rspamd integration)

---

### Phase 5: Scaling & Reliability ✅
**Completed:** 2026-01-19  
**Status:** 100%

- [x] Rspamd/ClamAV integration
- [x] Rate limiting
  - Per-IP SMTP limits
  - Per-user API limits
  - Per-endpoint thresholds
- [x] Abuse prevention
  - Allow/block rules engine
  - Abuse report system
  - Dynamic domain/IP filtering
- [x] Backup & disaster recovery
  - Daily PostgreSQL snapshots
  - Redis AOF + RDB backups
  - S3 + Google Drive backup destinations
  - Restore procedures documented
- [x] Backup automation (cron-based)
- [x] Retention policies (configurable TTL)
- [x] Soft-delete with audit logging

---

### Phase 6: Advanced Features ✅
**Completed:** 2026-01-20  
**Status:** 100%

- [x] Team collaboration
  - Inbox sharing with role-based access
  - Admin/Editor/Viewer permissions
  - Team CRUD operations
  - Invitation system
- [x] Labels system for message organization
- [x] Email filters with test preview
- [x] Per-inbox/user retention settings
  - Tier-based limits
  - Automatic cleanup jobs
- [x] Subscription tiers (4 tiers: FREE, BASIC, PRO, ENTERPRISE)
  - Feature gating (inbox count, storage, API calls)
  - Tier comparison UI
  - Upgrade/downgrade workflows
- [x] AI-powered email summarization
  - Gemini API integration
  - Tier-gated feature
  - Credit-based usage tracking
- [x] Prometheus metrics + Grafana dashboards
- [x] Admin panel with user management
- [x] Organization support (multi-tenant ready)

---

### Phase 7: Monetization & Enterprise (Partial) ⚠️
**Started:** 2026-02-01  
**Status:** 85%

#### Completed
- [x] Stripe integration (payments, webhooks, disputes)
- [x] SePay/VietQR integration (Vietnamese payments)
- [x] Subscription billing (recurring + one-time)
- [x] Redemption codes (promotions, trials)
- [x] Usage tracking & quota enforcement
- [x] Billing portal (invoice history, payment methods)
- [x] Provider API framework
  - cPanel plugin (Perl)
  - DirectAdmin plugin (PHP + Bash)
  - Plesk extension (PHP MVC)
  - WHMCS module (PHP)
  - Tenant provisioning webhooks
- [x] OAuth2/OpenID Connect provider setup
- [x] Magic link authentication
- [x] Telegram bot for 2FA + account linking
- [x] WebAuthn/Passkey support (FIDO2)

#### In Progress
- [ ] SAML authentication (enterprise SSO) — WIP
- [ ] LDAP directory sync — WIP
- [ ] OIDC refinements — WIP

---

## In-Progress & Planned

### Phase 8: Mobile App (In Progress) 🚀
**Target:** Q3 2026  
**Status:** 40% (foundation complete, UI in progress)

#### Completed
- [x] Core authentication & session management
  - JWT access tokens
  - Refresh token rotation + family tracking
  - Remember Me (30-day TTL)
  - Multi-tab session sync hardening
- [x] Backend refresh endpoint (`POST /auth/refresh`)
- [x] Offline-first architecture planning
- [x] Push notification infrastructure (FCM/APNs ready)

#### In Progress
- [ ] Technology selection (React Native + Expo vs Flutter)
- [ ] Inbox list view with real-time updates
- [ ] Message viewing with attachments
- [ ] Push notification handler
- [ ] Offline mode & local caching
- [ ] Biometric authentication (Face ID, Touch ID)
- [ ] App Store & Play Store submission

#### Acceptance Criteria
- Feature parity with web app (core CRUD)
- < 50 MB app size
- Offline message access (last 100 messages)
- Push notifications within 10 seconds of arrival
- 4.5+ star ratings on both stores

---

### Phase 8B: Infrastructure & Scale (Planned) 📡
**Target:** Q3/Q4 2026  
**Status:** 0%

- [ ] Multi-region Kubernetes deployment (US, EU, APAC)
- [ ] PostgreSQL replication (hot-standby)
- [ ] Redis cluster mode (sharding for 100K+ users)
- [ ] CDN integration (CloudFlare / AWS CloudFront)
- [ ] Database read replicas (read scaling)
- [ ] Load balancing (NGINX / HAProxy)
- [ ] Geographic redundancy (MX records, DNS failover)
- [ ] Auto-scaling policies (HPA, VPA)

#### Success Metrics
- RTO: < 15 minutes (from 1 hour)
- RPO: < 5 minutes (from 15 minutes)
- P95 latency: < 150ms (from 200ms)
- Uptime SLA: 99.99% (four nines)

---

### Phase 9: Protocol Support (Planned) 📧
**Target:** Q3 2026+  
**Status:** 0%

- [ ] **IMAP Access**
  - Third-party email client support
  - RFC 3501 compliance
  - Folder sync (Labels → folders)
  - Flag support (read, starred, etc.)
  - Estimated: 400 LOC backend

- [ ] **POP3 Access** (optional, lower priority)
  - Basic mailbox access
  - Estimated: 200 LOC backend

- [ ] **CalDAV/CardDAV** (stretch goal)
  - Calendar sync
  - Contact management
  - Integration with standard clients (Thunderbird, Outlook)
  - Estimated: 800+ LOC backend

#### Acceptance Criteria
- IMAP: Thunderbird, Apple Mail, Gmail client can connect
- Full message sync with offline access
- Label filtering + search
- No data loss on sync

---

### Phase 10: Analytics & Enterprise Compliance (Planned) 📊
**Target:** Q4 2026+  
**Status:** 0%

- [ ] Advanced analytics dashboard
  - Message volume trends
  - User activity heatmaps
  - Domain performance metrics
  - API usage breakdown
  - Customizable reports

- [ ] Real-time monitoring dashboards
  - Live message ingest rates
  - SMTP pipeline health
  - API latency heatmaps
  - Queue depth visualization

- [ ] Performance profiling & optimization
  - Database query slow log analysis
  - Redis key analysis
  - Worker throughput tracking
  - Memory leak detection

- [ ] Compliance & audit
  - **GDPR:** Right to deletion, data portability, consent audit trail
  - **CCPA:** Opt-out tracking, transparency reports
  - **SOC 2:** Audit logging, incident response procedures
  - **HIPAA:** Encryption, access controls, audit trails (if needed)
  - **DLP Framework:** Data loss prevention rules (beta)

---

### Phase 11: White-Label & Enterprise Features (Planned) 🏢
**Target:** 2027 Q1+  
**Status:** 0%

- [ ] Custom branding system
  - Favicon, logo, color scheme
  - Custom domain support (subdomain routing)
  - Email templates customization
  - Branded mobile app builds

- [ ] Advanced RBAC
  - Custom role definitions
  - Permission granularity (inbox-level, message-level)
  - Delegation workflows

- [ ] SLA & Support Tiers
  - Priority queue for support tickets
  - Uptime SLAs (99.5%, 99.9%, 99.99%)
  - Dedicated account manager (enterprise tier)

- [ ] API Versioning & Deprecation
  - v1, v2 endpoint support
  - Gradual migration path
  - Sunset notices (12-month notice period)

---

## Known WIP & Blockers

### In `/src/_wip/` Directory
- **SAML Integration** - Enterprise SSO setup incomplete
- **LDAP Directory** - Schema mapping pending
- **OIDC Enhancements** - Provider discovery incomplete
- **DLP Framework** - Data classification rules skeleton

### Blocking Issues
- None currently blocking production release
- Mobile app tech decision (React Native vs Flutter) pending product review
- Multi-region setup requires infrastructure investment

### Technical Debt
- [ ] IMAP/POP3/WebDAV server optimization (currently basic implementation)
- [ ] Database query optimization for large datasets (> 1M messages)
- [ ] Frontend performance profiling (bundle size optimization)
- [ ] API documentation auto-generation (currently manual OpenAPI)

---

## Timeline & Dependencies

```
Q3 2026
├─ Mobile App MVP (Jul-Aug)
├─ SAML/LDAP enterprise SSO (Jul)
├─ Multi-region K8s setup (Aug)
└─ Phase 8B Infrastructure (Aug-Sep)

Q4 2026
├─ Analytics dashboard
├─ Compliance framework (GDPR/CCPA/SOC2)
├─ Protocol support (IMAP) (Oct)
└─ Performance optimization pass

2027 Q1+
├─ White-label system
├─ Advanced enterprise features
└─ Ongoing scaling & optimization
```

---

## Success Metrics & KPIs

| Metric | Target | Current |
|--------|--------|---------|
| **Users** | 50K+ | 5K+ |
| **Inboxes** | 100K+ | 12K+ |
| **Messages/day** | 1M+ | 200K+ |
| **API Uptime** | 99.9% | 99.95% |
| **P95 Latency** | < 200ms | 150ms |
| **Test Coverage** | > 80% | 78% |
| **NPS Score** | > 45 | 42 |
| **Churn Rate** | < 5%/mo | 3.2%/mo |
| **Monthly Recurring Revenue** | $20K+ | $8.5K |

---

## Risk Assessments

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Database performance at scale | HIGH | MEDIUM | Read replicas, archival strategy, query optimization |
| Email deliverability issues | HIGH | LOW | SPF/DKIM/DMARC setup, monitoring, SES integration |
| Security vulnerabilities | CRITICAL | LOW | Regular audits, penetration testing, bug bounty |
| Team capacity constraints | MEDIUM | LOW | Hire additional engineers, prioritize features |
| Regulatory changes (GDPR/CCPA) | MEDIUM | MEDIUM | Compliance framework, legal review quarterly |
| Competing services | MEDIUM | MEDIUM | Focus on API-first, developer experience, pricing |

---

## References

- **GitHub:** https://github.com/manhquydev/email-platform
- **Live Demo:** https://app.manhquy.id.vn
- **API Docs:** https://api.manhquy.id.vn/docs
- **Status Page:** (planned)
- **Developer Blog:** (planned)
