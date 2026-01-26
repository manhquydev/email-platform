# Plan C: Privacy Identity Platform (RECOMMENDED)

## Executive Summary

- **Target Audience**: Privacy-conscious users + Developers + Enterprise
- **Core Value Proposition**: "Your Anonymous Digital Identity Layer - No PII, No Tracking, Just Privacy"
- **Revenue Model**: Identity Bundles (B2C) + Developer API (B2B) + Enterprise Teams
- **Differentiator**: Mullvad-style no-account model + AI Gatekeeper + Open-core

## Why Plan C?

Combines best of Plan A (consumer reach) + Plan B (developer focus) + Emerging Tech + Privacy Startup Playbooks.

| Aspect | Plan A | Plan B | **Plan C** |
|--------|--------|--------|------------|
| Target | Consumers | Developers | **All segments** |
| Differentiation | Low | High | **Very High** |
| Month 12 MRR | $8K | $40K | **$60K+** |
| Existing Code Use | 60% | 70% | **85%** |
| Time to Revenue | 2-4 weeks | 6-8 weeks | **4-6 weeks** |

## Pros

- **Mullvad-style differentiation**: No-account model creates cult following
- **Leverage 85% existing code**: Passkey, AI, billing already partially built
- **Multi-revenue streams**: B2C bundles + B2B API + Enterprise
- **Network effects**: Open-source + community + ecosystem
- **Future-proof**: Edge processing, ZK Email readiness

## Cons

- **Complexity**: More features to coordinate
- **Resource split**: Serving multiple segments
- **Open-source risk**: Must balance free vs paid carefully

---

## Phase 1: Anonymous Identity Layer

**Effort**: 8h | **Priority**: P0 | **Week**: 1-2

### Description
Mullvad-style signup using Passkey only. No email, no username, no PII.

### Key Features
- Passkey-only signup (WebAuthn)
- Random 16-digit account ID (like Mullvad)
- Instant ephemeral inbox on first visit
- Session persistence via localStorage

### Technical Tasks

1. **Complete Passkey Flow** (`services/api/src/routes/passkey-auth.ts`)
   - Leverage existing `PasskeyCredential` model
   - Add registration without email requirement
   - Generate random account ID on success

2. **Anonymous Session Service** (`services/api/src/services/anonymous-session.service.ts`)
   - Create session from Passkey public key
   - No PII stored, just credential reference
   - Session recovery via same Passkey

3. **Instant Inbox on Visit** (`services/web/src/app/(public)/page.tsx`)
   - Auto-generate ephemeral inbox
   - Store token in localStorage
   - Prompt Passkey registration to "save" inbox

4. **Account ID System**
   ```typescript
   // Generate Mullvad-style ID
   const accountId = crypto.randomBytes(8).toString('hex'); // 16 chars
   // Display: "1234-5678-90ab-cdef"
   ```

### Database Changes
```prisma
model AnonymousAccount {
  id            String   @id @default(uuid())
  accountCode   String   @unique // "1234-5678-90ab-cdef"
  passkeyId     String?  @unique
  passkey       PasskeyCredential? @relation(fields: [passkeyId], references: [id])
  inboxes       Inbox[]
  createdAt     DateTime @default(now())
}
```

### Success Criteria
- [ ] Signup without any PII collected
- [ ] Account accessible via Passkey only
- [ ] Instant inbox < 1 second

---

## Phase 2: AI Gatekeeper

**Effort**: 10h | **Priority**: P0 | **Week**: 2-3

### Description
AI that actively protects, not just summarizes. Strip tracking, extract OTPs, detect phishing.

### Key Features
- Auto OTP/verification code extraction
- Tracking pixel stripping
- Phishing/scam detection
- Smart categorization (Verification/Newsletter/Receipt/Promo)

### Technical Tasks

1. **OTP Extraction Service** (`services/api/src/services/otp-extractor.service.ts`)
   - Regex patterns for common OTP formats
   - LLM fallback for complex cases
   - API endpoint: `GET /v1/messages/:id/otp`
   - Cache extracted codes

2. **Tracking Sanitizer** (`services/api/src/services/email-sanitizer.service.ts`)
   - Strip tracking pixels (1x1 images)
   - Rewrite tracking URLs through proxy
   - Remove email open trackers
   - Run on email ingestion

3. **Phishing Detection** (`services/api/src/services/phishing-detector.service.ts`)
   - Check sender reputation
   - Analyze URL patterns
   - LLM content analysis
   - Flag with warning banner

4. **Smart Categorization**
   - Categories: verification, newsletter, receipt, promotional, personal
   - Auto-tag on ingestion
   - Filter API: `?category=verification`

### AI Pricing Tiers
| Tier | AI Operations/day |
|------|-------------------|
| Free | 10 |
| Starter | 100 |
| Pro | Unlimited |

### Success Criteria
- [ ] OTP extraction 95%+ accuracy
- [ ] Tracking pixels 100% stripped
- [ ] Phishing < 1% false positive

---

## Phase 3: Developer API + SDKs

**Effort**: 12h | **Priority**: P1 | **Week**: 3-4

### Description
"Stripe for Privacy" - World-class developer experience.

### Key Features
- REST API v1 with OpenAPI spec
- Official SDKs (Node.js, Python)
- Webhook system with HMAC signing
- Interactive developer portal

### Technical Tasks

1. **API v1 Endpoints** (`services/api/src/routes/v1/`)
   ```
   POST   /v1/inboxes              # Create inbox
   GET    /v1/inboxes/:id          # Get inbox
   DELETE /v1/inboxes/:id          # Delete inbox
   GET    /v1/inboxes/:id/messages # List messages
   GET    /v1/messages/:id         # Get message
   GET    /v1/messages/:id/otp     # Extract OTP
   POST   /v1/webhooks             # Register webhook
   ```

2. **API Key Management**
   - Key format: `eph_live_xxxx` / `eph_test_xxxx`
   - Scopes: `inboxes:read`, `inboxes:write`, `messages:read`
   - Rate limiting per key based on tier

3. **Node.js SDK** (`packages/sdk-node/`)
   ```typescript
   import { Ephemera } from '@ephemera/sdk';
   const client = new Ephemera('eph_live_xxx');
   const inbox = await client.inboxes.create();
   const otp = await client.messages.extractOtp(messageId);
   ```

4. **Python SDK** (`packages/sdk-python/`)
   ```python
   from ephemera import Ephemera
   client = Ephemera('eph_live_xxx')
   inbox = client.inboxes.create()
   ```

5. **Developer Portal** (`services/web/src/app/developer/`)
   - API key management
   - Usage dashboard
   - Interactive API explorer (Swagger UI)
   - Webhook logs

### API Pricing
| Tier | Price | Requests/mo | Inboxes |
|------|-------|-------------|---------|
| Free | $0 | 1,000 | 10 |
| Starter | $20/mo | 10,000 | 100 |
| Pro | $60/mo | 50,000 | 500 |
| Enterprise | Custom | Unlimited | Unlimited |

### Success Criteria
- [ ] Time to First API Call < 5 minutes
- [ ] SDKs published to npm/pypi
- [ ] 99.9% API uptime

---

## Phase 4: Identity Suite Bundles

**Effort**: 10h | **Priority**: P1 | **Week**: 4-5

### Description
Not just temp mail - complete identity protection ecosystem (Proton playbook).

### Key Features
- Permanent email aliases with forwarding
- Breach monitoring (Have I Been Pwned)
- Data broker removal integration
- Privacy score dashboard

### Technical Tasks

1. **Alias System Enhancement**
   - Permanent aliases (not ephemeral)
   - Two-way forwarding (reply via alias)
   - Custom alias: `myname@ephemera.email`
   - Enable/disable without deletion

2. **Breach Monitoring** (`services/api/src/services/breach-monitor.service.ts`)
   - Integrate HIBP API
   - Monitor user's real email (opt-in)
   - Alert on new breaches
   - Cron job for periodic checks

3. **Privacy Score Dashboard**
   - Score based on: alias usage, breach exposure, tracking blocked
   - Gamification: "Improve score by..."
   - Visual dashboard component

4. **Data Broker Integration**
   - Partner API (Incogni, DeleteMe)
   - Or white-label service
   - Status tracking in dashboard

### Bundle Pricing
| Bundle | Price | Includes |
|--------|-------|----------|
| Email Shield | $5/mo | 50 aliases, forwarding |
| Identity Guard | $15/mo | + Breach monitoring + AI |
| Privacy Pro | $30/mo | + Data broker removal |
| Team | $10/user/mo | Shared inboxes, SSO |

### Success Criteria
- [ ] Alias forwarding < 5s latency
- [ ] Breach alerts within 24h of HIBP update
- [ ] 50+ data brokers covered

---

## Phase 5: Open-Core & Community

**Effort**: 8h | **Priority**: P2 | **Week**: 5-6

### Description
Build trust through transparency. Open source core, monetize cloud.

### Key Features
- AGPL-licensed core on GitHub
- Docker one-liner self-hosting
- Anonymous referral program
- Community forum

### Technical Tasks

1. **Repository Restructure**
   ```
   ephemera/
   ├── core/           # AGPL - Community Edition
   │   ├── api/
   │   ├── smtp/
   │   └── docker-compose.yml
   ├── cloud/          # Proprietary - Cloud Edition
   │   ├── billing/
   │   └── enterprise/
   └── docs/
   ```

2. **Feature Flags** (`core/src/lib/feature-flags.ts`)
   - `EPHEMERA_EDITION=cloud` for enterprise features
   - Clean degradation for self-hosters

3. **Anonymous Referral System**
   - Hash-based codes (no PII linking)
   - Double-blind rewards
   - Rewards: +10 aliases, +1 month free

4. **Documentation Site** (VitePress)
   - Self-hosting guide
   - API reference
   - Contributing guidelines

### Success Criteria
- [ ] `docker compose up` works < 5 minutes
- [ ] 100+ GitHub stars in 3 months
- [ ] 10+ community contributors

---

## Phase 6: Edge Processing (Future)

**Effort**: 6h | **Priority**: P3 | **Week**: 6-8

### Description
Process emails at edge for maximum privacy and compliance.

### Key Features
- Cloudflare Email Workers integration
- Regional data sovereignty
- Never store unencrypted on central server

### Success Criteria
- [ ] EU emails processed in EU nodes
- [ ] Zero unencrypted storage

---

## Revenue Projections

| Timeline | Free Users | B2C Bundles | B2B API | Enterprise | Total MRR |
|----------|------------|-------------|---------|------------|-----------|
| Month 1 | 2,000 | $500 | $400 | $0 | **$900** |
| Month 3 | 10,000 | $4,000 | $2,000 | $500 | **$6,500** |
| Month 6 | 30,000 | $12,000 | $6,000 | $2,000 | **$20,000** |
| Month 12 | 100,000 | $30,000 | $20,000 | $10,000 | **$60,000** |

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No-account confusion | Medium | Medium | Clear UX, Passkey education |
| AI costs spiral | Medium | Medium | Caching, usage limits, fallback rules |
| Open-source freeloaders | Low | High | Enterprise features exclusive |
| Passkey browser support | Low | Low | Fallback to email/pass option |

## Implementation Timeline

```
Week 1-2: Phase 1 (Anonymous Identity) ─────────────────┐
Week 2-3: Phase 2 (AI Gatekeeper) ──────────────────────┤
Week 3-4: Phase 3 (Developer API) ──────────────────────┼──► MVP Launch
Week 4-5: Phase 4 (Identity Bundles) ───────────────────┤
Week 5-6: Phase 5 (Open-Core) ──────────────────────────┘
Week 6-8: Phase 6 (Edge Processing) ────────────────────► v1.1
```

## Next Steps

1. **Immediate**: Complete Passkey UI integration (existing model)
2. **Week 1**: Build OTP extraction + tracking sanitizer
3. **Week 2**: Developer API v1 + Node.js SDK
4. **Week 3**: Identity bundles + breach monitoring
5. **Week 4**: Open-source release + Product Hunt launch
