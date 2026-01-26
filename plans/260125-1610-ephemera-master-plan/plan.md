---
title: "Ephemera Master Plan: Privacy Identity Platform"
description: "Definitive roadmap - Mullvad-style anonymous identity + AI protection + Developer API"
status: approved
priority: P0
effort: 54h
branch: main
tags: [strategy, monetization, privacy, identity, api, ai]
created: 2026-01-25
---

# Ephemera Master Plan: Privacy Identity Platform

> **FINAL DECISION** - Consolidation of all research into ONE executable plan

## Executive Decision

After extensive research analyzing:
- 4 competitor reports (temp-mail.org, guerrillamail, mailinator, 10minutemail)
- Privacy startup playbooks (Proton, SimpleLogin, Mullvad, Bitwarden)
- Emerging tech trends (Passkeys, Edge Computing, ZK Email, AI Agents)
- Current codebase capabilities (85% infrastructure ready)

**I am making the strategic decision to pursue the "Privacy Identity Platform" model.**

### Why This Direction?

| Factor | Decision Rationale |
|--------|-------------------|
| **Market Position** | Blue ocean - no competitor combines anonymous identity + AI protection + developer API |
| **Revenue Potential** | $60K MRR at Month 12 (vs $8K traditional, $40K dev-only) |
| **Existing Assets** | 85% code exists - Passkey model, AI service, billing, WebSocket |
| **Differentiation** | Mullvad-style no-PII is unmatched in email space |
| **Defensibility** | Open-core + community + ecosystem = high switching costs |

---

## The Vision

> **"Ephemera: Your Anonymous Digital Identity Layer"**
>
> No email required. No username. No tracking. Just privacy.

---

## Implementation Phases

| Phase | Name | Effort | Priority | Week |
|-------|------|--------|----------|------|
| 1 | [Anonymous Identity Layer](./phase-01-anonymous-identity.md) | 8h | P0 | 1-2 |
| 2 | [AI Gatekeeper](./phase-02-ai-gatekeeper.md) | 10h | P0 | 2-3 |
| 3 | [Developer API + SDK](./phase-03-developer-api.md) | 12h | P1 | 3-4 |
| 4 | [Identity Suite Bundles](./phase-04-identity-bundles.md) | 10h | P1 | 4-5 |
| 5 | [Public Ephemeral Inbox](./phase-05-public-inbox.md) | 8h | P1 | 5-6 |
| 6 | [Open-Core & Community](./phase-06-open-core.md) | 6h | P2 | 6-7 |

**Total Effort: 54h (~7 working days)**

---

## Revenue Model

### B2C: Identity Bundles
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 ephemeral inboxes, 10 AI ops/day |
| Shield | $5/mo | 50 aliases, forwarding, no ads |
| Guard | $15/mo | + Breach monitoring + unlimited AI |
| Pro | $30/mo | + Data broker removal + priority |

### B2B: Developer API
| Tier | Price | Requests/mo |
|------|-------|-------------|
| Free | $0 | 1,000 |
| Starter | $20/mo | 10,000 |
| Pro | $60/mo | 50,000 |
| Enterprise | Custom | Unlimited + SLA |

### B2B: Teams/Enterprise
| Tier | Price | Features |
|------|-------|----------|
| Team | $10/user/mo | Shared inboxes, roles |
| Enterprise | Custom | SSO, audit logs, SLA |

---

## Revenue Projections

| Month | Free Users | Paid B2C | Paid B2B | MRR |
|-------|------------|----------|----------|-----|
| 1 | 2,000 | 100 | 20 | $1,400 |
| 3 | 10,000 | 500 | 100 | $7,000 |
| 6 | 30,000 | 1,500 | 300 | $22,000 |
| 12 | 100,000 | 5,000 | 1,000 | **$60,000** |

---

## Key Differentiators

### 1. Mullvad-Style Anonymous Accounts
- Signup with Passkey ONLY - no email, no username
- Random 16-digit account ID
- Zero PII collected

### 2. AI Gatekeeper (Not Just Summarizer)
- Auto-extract OTP/verification codes
- Strip tracking pixels before display
- Detect phishing with AI + rules hybrid
- Smart categorization

### 3. Identity Suite (Proton Ecosystem Play)
- Email aliases → Breach monitoring → Data broker removal
- "Privacy Score" gamification
- Cross-sell path built-in

### 4. Developer-First API
- "Stripe for Privacy" positioning
- Official SDKs (Node.js, Python)
- 5-minute time-to-first-API-call

---

## Existing Code Leverage

| Component | Status | Leverage |
|-----------|--------|----------|
| PasskeyCredential model | Exists | 90% |
| AI summary service | Exists | 70% |
| Billing (Stripe + SePay) | Complete | 100% |
| WebSocket real-time | Complete | 100% |
| Rate limiting | Complete | 100% |
| Browser extension | Complete | 100% |
| SMTP ingestion | Complete | 100% |
| Rspamd + ClamAV | Complete | 100% |

**Overall: 85% infrastructure ready**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Passkey browser support | Fallback to email/pass for legacy browsers |
| AI cost spiral | Caching, daily limits, rule-based fallback |
| Open-source freeloaders | Enterprise features exclusive to cloud |
| No-account UX confusion | Clear onboarding, Passkey education modal |

---

## Success Metrics

### Phase 1-2 (Week 1-3)
- [ ] Passkey signup works without email
- [ ] OTP extraction 95%+ accuracy
- [ ] Tracking pixels 100% stripped

### Phase 3-4 (Week 3-5)
- [ ] API v1 live with Node.js SDK
- [ ] 100 API signups first month
- [ ] Identity bundles purchasable

### Phase 5-6 (Week 5-7)
- [ ] Public inbox generates 5K+ visits/week
- [ ] GitHub repo 100+ stars
- [ ] Community forum active

---

## Launch Strategy

1. **Week 1-4**: Build core features
2. **Week 5**: Soft launch to privacy communities (Reddit, HN)
3. **Week 6**: Product Hunt launch
4. **Week 7**: Open-source announcement
5. **Month 2**: Developer outreach, API partnerships

---

## Research References

- [Competitor Analysis](../reports/researcher-260125-1538-tempmail-competitors.md)
- [Monetization Strategies](../reports/researcher-260125-1538-monetization-strategies.md)
- [Disruptive Innovations](../reports/researcher-260125-1543-disruptive-innovations.md)
- [Viral Growth Strategies](../reports/researcher-260125-1543-viral-growth-strategies.md)
- [Emerging Tech 2025-26](../reports/researcher-260125-1603-emerging-tech-trends.md)
- [Capability Gap Analysis](../reports/scout-260125-1603-capability-gap-analysis.md)
- [Privacy Startup Playbooks](../reports/researcher-260125-1603-privacy-startup-playbooks.md)

---

## Decision Authority

**This plan is APPROVED for implementation.**

Next: Begin Phase 1 - Anonymous Identity Layer
