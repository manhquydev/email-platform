# Delivery Roadmap & Checklist (aligned with blueprint.md)

## 1) Stability & Testing
- [x] API unit tests (utils) — initial
- [x] API integration (auth -> domain -> inbox -> messages)
- [x] API e2e SMTP ingest -> message listing
- [x] Web UI tests (component smoke)
- [x] CI pipeline (lint/build/test for api + web)
- [x] Seed data/test fixtures & env separation (test DB env + defaults)

## 2) Abuse Control & Retention
- [x] Rate limit (API IP-level; defaults configurable)
- [x] Quota per inbox/domain (env-based; enforced on ingest)
- [x] CAPTCHA/verification for public inbox creation (if exposed)
- [x] Abuse/blocklist allow/deny rules
- [x] Abuse/blocklist allow/deny (sender domain blocklist)
- [x] TTL/retention jobs for inbox/messages (configurable)
- [x] Attachment size limits (env-based)

## 3) Deliverability & Security
- [x] Disable auto-domain-creation in prod by default (env defaults false)
- [x] SPF/DKIM/DMARC guidance + UI surfacing tokens
- [ ] Outbound signing + bounce/complaint handling (for hybrid)
- [ ] Rspamd/ClamAV optional integration
- [ ] MTA-STS/TLS-RPT optional

## 4) Observability & Ops
- [ ] Structured logging + log shipping
- [x] Metrics (Prometheus) + dashboards/alerts (basic /metrics)
- [x] Health probe (HTTP /health; ready=health for now)
- [x] Backup/restore playbooks (DB + storage)
- [ ] Runbooks for oncall (abuse/delivery incidents)

## 5) UI/UX & Access
- [x] RBAC (admin/user) surfaced in UI
- [x] Pagination (messages, limit/offset)
- [x] Search/filter for inbox/messages
- [x] Attachment download/view (download link)
- [x] Domain onboarding wizard (SPF/DKIM/DMARC steps)
- [ ] Localization & accessibility pass

## 6) Outbound/Hybrid (optional)
- [x] Integrate SES/Mailgun/SendGrid for outbound
- [ ] Template management + webhook handling
- [ ] Sender reputation guardrails (rate, feedback loop)

Progress to-date: inbound-only stack (API + SMTP + DB) and basic web UI for login, domains, inboxes, messages.
