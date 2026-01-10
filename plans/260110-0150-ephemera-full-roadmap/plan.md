---
title: "Ephemera Full Roadmap"
description: "Privacy-first temp mail platform with developer ecosystem and premium features"
status: pending
priority: P1
effort: 40h
branch: main
tags: [privacy, sdk, outbound, team, premium]
created: 2026-01-10
---

# Ephemera Full Roadmap

## Strategy
**Privacy-First + Developer-Friendly** temp mail platform.

## Current State
- Multi-domain support, custom domain verification, DKIM ready
- RESTful API (JWT + API Key auth), Webhook support
- React 19 + Vite + TailwindCSS (Glassmorphism UI)
- 2FA, Magic link, Stripe billing, Admin panel
- Outbound mail infrastructure exists (schema + routes)

## Phases

### Phase 1: Trust & Polish (~12h)
Privacy policy, trust signals, IP anonymization, metadata stripping, onboarding UX.
- [phase-01-trust-polish.md](./phase-01-trust-polish.md)

### Phase 2: Developer Ecosystem (~16h)
JavaScript SDK, Python SDK, CLI tool, webhook dashboard, API analytics, bulk ops.
- [phase-02-developer-ecosystem.md](./phase-02-developer-ecosystem.md)

### Phase 3: Premium Features (~12h)
Send/reply (DKIM), team inboxes, extended retention, custom domain improvements.
- [phase-03-premium-features.md](./phase-03-premium-features.md)

## Dependencies
- Phase 2 depends on Phase 1 (privacy docs for SDK examples)
- Phase 3 depends on Phase 2 (SDK for team features)

## Success Metrics
- Trust: <100ms privacy page load, zero PII in logs
- Developer: SDK install <30s, 95% API coverage
- Premium: <500ms send latency, team RBAC working

## Risk Summary
| Risk | Mitigation |
|------|------------|
| DKIM misconfiguration | Use nodemailer built-in, test with mail-tester.com |
| SDK maintenance burden | Codegen from OpenAPI spec |
| Team permissions complexity | Start with 3 roles only |

## Reports
- [Privacy & SDK Research](./research/researcher-privacy-sdk-report.md)
- [Outbound & Team Research](./research/researcher-outbound-team-report.md)
