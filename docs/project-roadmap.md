# Ephemera Project Roadmap

## 1. Project Vision
Ephemera is a high-performance, secure, and user-friendly email platform for professionals and businesses. It provides disposable inboxes, custom domain support, and a modern web interface.

## 2. Overall Progress
**Current Status:** Production Beta
**Overall Completion:** 97%
**Last Updated:** 2026-02-25

## 3. Implementation Phases

### Phase 1: Core Platform Foundation (Completed)
- [x] Multi-domain support & verification
- [x] SMTP Ingest server
- [x] RESTful API with JWT Authentication
- [x] Basic Web UI (Inbox management, Message viewing)
- [x] Docker-based deployment (Caddy, Postgres, Redis)

### Phase 2: User Experience & Real-time (Completed)
- [x] Real-time email delivery (WebSockets/Polling)
- [x] UI Glassmorphism design system
- [x] Attachment handling & preview
- [x] Search & pagination for messages
- [x] OAuth2-compliant automatic token refresh (Phase 1 & 2)
- [x] Session management hardening (expiry redirect, initAuth dedup, multi-tab sync, Remember Me)
- [x] Security hardening: opaque refresh tokens for register/SSO, multi-tab race condition fix, CSRF shared-cookie, CSRF removed from SSO redirect URL (Phase 4)

### Phase 3: Browser Extension - Stabilization (Completed)
**Status:** 100%
**Completed:** 2026-01-17
- [x] Migrate to WXT framework
- [x] Implement Chrome Side Panel API
- [x] CSP & Security hardening
- [x] Unit & E2E testing (79 tests)
- [x] i18n localization (EN/VI)
- [x] Store publishing preparation

### Phase 4: Power User Features (Completed)
**Status:** 100%
**Completed:** 2026-01-17
- [x] Enhanced Forwarding Rules Engine (multi-destination)
- [x] OTP Auto-Extractor with confidence scoring
- [x] Webhook Notifications (MailHook)
- [x] Outbound email with DKIM signing
- [x] Reply/Forward from inbox address

### Phase 5: Scaling & Reliability (Completed)
**Status:** 100%
**Completed:** 2026-01-19
- [x] Rspamd/ClamAV integration
- [x] Rate limiting & abuse prevention
- [x] Backup management (local + cloud via rclone)
- [x] Automated scheduled backups (cron configuration)
- [x] Backup scripts with retention policies

### Phase 6: Advanced Features (Completed)
**Status:** 100%
**Completed:** 2026-01-20
- [x] Team collaboration & shared inboxes (full CRUD, role-based access)
- [x] Email filters with test preview functionality
- [x] Per-inbox/user retention settings with tier limits
- [x] Labels system for message organization
- [x] Advanced subscription tiers (4 tiers, 13 features, comparison UI)
- [x] AI-powered email summarization (Gemini API, tier-gated, credit-based)

### Phase 7: Enterprise & Scale (Future)
**Status:** Planned
**Target:** 2026-Q3+

#### 7.1 Mobile App Development
- [x] Core authentication & session management (Backend refresh endpoint + client-side hardening)
- [x] Remember Me (30-day TTL) and expired session UX
- [ ] Technology selection (Flutter vs React Native evaluation)
- [ ] Inbox list & message viewing
- [ ] Push notifications (FCM/APNs)
- [ ] Offline mode & local caching
- [ ] App Store & Play Store submission

#### 7.2 Infrastructure & Scale
- [ ] Multi-region architecture (K8s, PostgreSQL replication, GeoDNS)
- [ ] CDN integration for static assets
- [ ] Database read replicas for query distribution
- [ ] Redis cluster for session & cache scaling

#### 7.3 Protocol Support
- [ ] IMAP access for third-party email clients
- [ ] POP3 access (optional, lower priority)
- [ ] CalDAV/CardDAV for calendar & contacts (stretch goal)

#### 7.4 Analytics & Monitoring
- [ ] Advanced analytics dashboard (usage metrics, trends)
- [ ] Real-time monitoring & alerting (Prometheus/Grafana)
- [ ] Performance optimization & profiling
- [ ] A/B testing infrastructure

#### 7.5 Enterprise Features
- [ ] SSO/SAML integration
- [ ] Audit logging & compliance reports
- [ ] Custom branding (white-label option)
- [ ] SLA-backed support tiers

## 4. Changelog Summary
Refer to [CHANGELOG.md](./changelog.md) for detailed version history.
