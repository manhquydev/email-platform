# Plan B: Developer-First Privacy Platform

## Executive Summary

- **Target Audience**: Developers (QA testing, auth flows), Privacy enthusiasts, Security-conscious users
- **Core Value Proposition**: "Stripe for Privacy" - Infrastructure developers trust, not just a tool
- **Revenue Model**: API licensing (B2B) + Open-core hosting + Privacy-as-a-Service bundles

## Pros

- **Blue Ocean**: Few competitors target developers specifically (Mailinator charges $150+/mo for API)
- **High LTV**: B2B API customers have 10-20x higher lifetime value than consumers
- **Network Effects**: Open-source creates community, community creates marketing
- **Defensibility**: Trust + ecosystem + integrations create switching costs
- **Premium Pricing**: Developers pay for reliability, not features
- **Brand Halo**: "Privacy-first" positioning attracts organic press/backlinks

## Cons

- **Longer Sales Cycle**: B2B requires documentation, demos, support
- **Higher Bar**: Developers expect 99.9% uptime, clean docs, SDKs
- **Open-Source Risk**: Must balance free vs. paid features carefully
- **Smaller TAM**: Fewer developers than consumers (but higher ARPU)
- **Support Burden**: Technical users ask harder questions

---

## Phase 1: Open-Core Architecture

**Effort**: 6h
**Priority**: P1
**Status**: Pending

### Description
Restructure codebase as open-core: community edition (self-hostable) + cloud edition (managed service). This builds trust and creates organic marketing.

### Key Features
- Docker Compose one-liner for self-hosting
- Clear separation of community vs. enterprise features
- AGPL license (prevents proprietary forks)
- Public GitHub repo with contribution guidelines

### Technical Tasks

1. **Repository Restructure**
   ```
   ephemera/
   ├── core/                    # AGPL - Community Edition
   │   ├── services/api/        # Core API (moved from services/)
   │   ├── services/smtp/       # SMTP handler
   │   ├── docker-compose.yml   # Self-host stack
   │   └── README.md            # Self-hosting guide
   ├── cloud/                   # Proprietary - Cloud Edition
   │   ├── services/billing/    # Stripe/SePay integration
   │   ├── services/analytics/  # Usage tracking
   │   └── features/enterprise/ # SSO, audit logs, SLA
   └── docs/                    # Public documentation
   ```

2. **Docker Compose Setup** (`core/docker-compose.yml`)
   - PostgreSQL + Redis + API + SMTP + Web
   - Environment variable configuration
   - Volume mounts for persistence
   - Health checks

3. **Feature Flags System** (`core/services/api/src/lib/feature-flags.ts`)
   - Check for `EPHEMERA_EDITION=cloud` env var
   - Gate enterprise features behind flag
   - Clean error messages for self-hosters

4. **Documentation Site** (use Docusaurus or VitePress)
   - Self-hosting guide
   - API reference (OpenAPI)
   - Architecture overview
   - Contributing guidelines

5. **License & Legal**
   - Add AGPL-3.0 LICENSE file
   - Contributor License Agreement (CLA)
   - Update package.json with license field

### Enterprise-Only Features (Cloud Edition)
- SSO/SAML authentication
- Audit logging with export
- SLA guarantees (99.9% uptime)
- Priority support queue
- Custom domain SSL automation
- Advanced analytics dashboard

### Success Criteria
- [ ] `docker compose up` works in < 5 minutes
- [ ] README has clear self-host vs cloud comparison
- [ ] First 10 GitHub stars within 1 week of launch

---

## Phase 2: Burner API (Developer SDK)

**Effort**: 10h
**Priority**: P1
**Status**: Pending

### Description
Public API for programmatic email generation. Primary monetization lever. Target: QA teams, auth testing, competitive intelligence.

### Key Features
- RESTful API with OpenAPI spec
- SDK packages (Node.js, Python, Go)
- Webhook notifications for incoming mail
- Bulk inbox creation (enterprise)
- Usage-based pricing

### Technical Tasks

1. **API Endpoints** (`services/api/src/routes/developer-api.ts`)
   ```
   POST   /v1/inboxes              # Create inbox (returns address + token)
   GET    /v1/inboxes/:id          # Get inbox details
   DELETE /v1/inboxes/:id          # Delete inbox
   GET    /v1/inboxes/:id/messages # List messages
   GET    /v1/messages/:id         # Get message detail
   POST   /v1/webhooks             # Register webhook
   DELETE /v1/webhooks/:id         # Remove webhook
   ```

2. **API Key Management**
   - Add `ApiKey` model to Prisma schema
   - Key generation: `eph_live_xxxx` / `eph_test_xxxx`
   - Scopes: `inboxes:read`, `inboxes:write`, `messages:read`
   - Rate limiting per key (based on tier)

3. **Usage Tracking** (`services/api/src/services/api-usage.service.ts`)
   - Track requests per API key
   - Aggregate daily/monthly usage
   - Emit usage events to billing service

4. **SDK Development**
   - **Node.js** (`@ephemera/sdk`):
     ```typescript
     import { Ephemera } from '@ephemera/sdk';
     const client = new Ephemera('eph_live_xxx');
     const inbox = await client.inboxes.create();
     const messages = await client.inboxes.messages(inbox.id);
     ```
   - **Python** (`ephemera-python`)
   - **Go** (`ephemera-go`)

5. **Webhook System**
   - Store webhook URLs per user
   - POST to webhook on new message
   - Retry with exponential backoff
   - Signature verification (HMAC)

6. **Developer Portal** (`services/web/src/app/developer/`)
   - API key management UI
   - Usage dashboard
   - Interactive API explorer (Swagger UI)
   - Webhook configuration

### API Pricing Tiers
| Tier | Price | Requests/mo | Inboxes | Webhooks |
|------|-------|-------------|---------|----------|
| Free | $0 | 1,000 | 10 | 1 |
| Starter | $20/mo | 10,000 | 100 | 5 |
| Pro | $60/mo | 50,000 | 500 | 20 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

### Success Criteria
- [ ] Time to First API Call < 5 minutes
- [ ] 99.9% API uptime
- [ ] SDKs published to npm/pypi/go modules

---

## Phase 3: AI-Powered Features

**Effort**: 8h
**Priority**: P2
**Status**: Pending

### Description
Use AI as intelligent gatekeeper and productivity tool. Differentiates from commodity temp mail services.

### Key Features
- Smart email summarization
- Phishing/scam detection
- OTP/verification code extraction
- Content categorization

### Technical Tasks

1. **AI Service** (`services/api/src/services/ai-inbox.service.ts`)
   - Integration with OpenAI/Anthropic/local LLM
   - Caching to reduce API costs
   - Fallback to rule-based for failures

2. **Smart Summaries**
   - Endpoint: `GET /v1/messages/:id/summary`
   - Generate 1-2 sentence summary of email
   - Cache result in message metadata
   - Show in list view (premium feature)

3. **Phishing Detection**
   - Analyze sender reputation + content patterns
   - Flag suspicious emails with warning banner
   - Learn from user reports

4. **OTP Extraction**
   - Regex + LLM hybrid approach
   - Extract verification codes automatically
   - Display prominently in inbox UI
   - API endpoint: `GET /v1/messages/:id/otp`

5. **Content Categorization**
   - Categories: verification, newsletter, receipt, promotional, personal
   - Filter inbox by category
   - API filter: `GET /v1/inboxes/:id/messages?category=verification`

### AI Pricing
- Free: 10 AI operations/day
- Starter: 100 AI operations/day
- Pro: 500 AI operations/day
- Enterprise: Unlimited + custom models

### Success Criteria
- [ ] Summary accuracy > 90% (user feedback)
- [ ] OTP extraction works for top 50 services
- [ ] Phishing detection < 1% false positive rate

---

## Phase 4: Privacy-as-a-Service Bundle

**Effort**: 8h
**Priority**: P2
**Status**: Pending

### Description
Bundle email privacy with broader digital protection. Position as "Digital Bodyguard" service.

### Key Features
- Email aliasing (permanent forwarding)
- Data broker removal integration
- Breach monitoring alerts
- Privacy score dashboard

### Technical Tasks

1. **Email Aliasing System**
   - Permanent aliases that forward to real email
   - Reply-via-alias (two-way communication)
   - Disable/enable aliases without deletion
   - Custom alias creation: `myalias@ephemera.email`

2. **Data Broker Removal Integration**
   - Partner with service like Incogni, DeleteMe API
   - Or white-label existing removal service
   - Dashboard showing removal requests status
   - Automated re-checking for re-listings

3. **Breach Monitoring**
   - Integrate Have I Been Pwned API
   - Monitor user's real email (opt-in)
   - Alert when email appears in new breaches
   - Recommend password changes

4. **Privacy Score Dashboard**
   - Calculate score based on:
     - Alias usage (more = better)
     - Breach exposure
     - Data broker presence
   - Gamification: "Improve your score by..."

### Bundle Pricing
| Bundle | Price | Includes |
|--------|-------|----------|
| Email Only | $5/mo | 50 aliases, forwarding |
| Privacy Starter | $10/mo | Email + Breach monitoring |
| Privacy Pro | $20/mo | Email + Breach + Data broker removal |
| Privacy Ultimate | $50/mo | All + VPN partner + Priority support |

### Success Criteria
- [ ] Alias creation < 2 seconds
- [ ] Forwarding latency < 5 seconds
- [ ] Data broker coverage: 50+ brokers

---

## Phase 5: Community & Viral Growth

**Effort**: 8h
**Priority**: P3
**Status**: Pending

### Description
Build a movement, not just a user base. Privacy users are ideological and evangelize tools they trust.

### Key Features
- Public roadmap (GitHub Issues)
- Privacy hygiene content marketing
- Anonymous referral program
- Self-host community forum
- Plugin/integration ecosystem

### Technical Tasks

1. **Public Roadmap**
   - GitHub Issues with labels: `feature-request`, `in-progress`, `shipped`
   - Community voting via reactions
   - Monthly "What's New" changelog
   - Embed roadmap widget on website

2. **Content Marketing**
   - Blog: "Privacy Hygiene" guides (not Ephemera-focused)
   - Topics: "How to De-Google", "Email Privacy 101", "Avoiding Data Brokers"
   - SEO for privacy keywords (different from temp mail keywords)
   - Newsletter with privacy tips

3. **Anonymous Referral System**
   - Hash-based referral codes (no PII linking)
   - Double-blind rewards: both parties get bonus
   - Rewards: +10 aliases, +1 month free, +API quota
   - Dashboard showing referral count (not identities)

4. **Community Forum**
   - Self-hosted Discourse or Flarum
   - Categories: Self-hosting, Feature requests, Privacy tips
   - Badge system for contributors
   - Direct line to development team

5. **Integration Ecosystem**
   - Zapier integration
   - n8n node
   - GitHub Action for CI/CD testing
   - VS Code extension for dev workflows

### Viral Loop Mechanics
```
User signs up → Uses service → Gets value → Shares guide/tool
                                              ↓
                                         Friend signs up
                                              ↓
                                    Both get bonus (anonymous)
```

### Success Criteria
- [ ] 100+ GitHub stars in 3 months
- [ ] 1,000+ newsletter subscribers
- [ ] 50+ community forum posts/week

---

## Revenue Projections

| Timeline | API Users | Bundle Users | API MRR | Bundle MRR | Total MRR |
|----------|-----------|--------------|---------|------------|-----------|
| Month 1 | 20 | 50 | $400 | $500 | $900 |
| Month 3 | 100 | 200 | $2,000 | $2,000 | $4,000 |
| Month 6 | 300 | 500 | $6,000 | $5,000 | $11,000 |
| Month 12 | 1,000 | 2,000 | $20,000 | $20,000 | $40,000 |

**Assumptions**:
- API: Mix of $20 Starter and $60 Pro plans
- Bundle: Mix of $10 and $20 plans
- 10% month-over-month growth after Month 3

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Open-source competitors | Medium | Medium | Focus on UX, support, enterprise features |
| API abuse (spam) | High | Medium | Rate limiting, abuse detection, account suspension |
| AI costs spiral | Medium | Medium | Caching, usage limits, fallback to rules |
| Data broker API changes | Low | Medium | Multiple provider integrations |
| Self-host cannibalizes cloud | Low | Low | Enterprise features exclusive to cloud |

---

## Competitive Positioning

```
                    High Price
                        │
    Mailinator ────────┼──────── Ephemera Pro (target)
    (API for QA)       │         (API + Privacy bundle)
                       │
  Low ─────────────────┼─────────────────── High
  Differentiation      │              Differentiation
                       │
    Temp-Mail.org ─────┼──────── SimpleLogin/AnonAddy
    (Commodity)        │         (Aliasing only)
                       │
                   Low Price
```

---

## Next Steps

1. **Week 1**: Docker Compose self-host setup (Phase 1)
2. **Week 2**: API v1 + Node.js SDK (Phase 2)
3. **Week 3**: Developer portal + documentation
4. **Week 4**: Launch on Hacker News / Product Hunt
5. **Month 2**: AI features + Privacy bundle
6. **Month 3**: Community building + content marketing
