# Plan A: Traditional Freemium

## Executive Summary

- **Target Audience**: Mass consumers seeking throwaway emails for signups, spam avoidance
- **Core Value Proposition**: Zero-friction anonymous inbox with instant provisioning
- **Revenue Model**: Display ads (primary) + Premium subscriptions (secondary)

## Pros

- **Proven Model**: Competitors (Temp-Mail.org, 10MinuteMail) generate millions in revenue
- **Fast Time-to-Market**: 2-4 weeks to first revenue
- **Low Technical Risk**: Standard CRUD + WebSocket, no novel tech
- **SEO Traffic**: High-volume keywords ("temp mail", "fake email") are monetizable
- **Existing Infrastructure**: Public inbox routes already exist in codebase

## Cons

- **Saturated Market**: 50+ competitors with established SEO dominance
- **Low Defensibility**: No moat; competitors can copy any feature
- **Ad Dependency**: Revenue tied to CPM rates (volatile, declining)
- **High Churn**: Users have no loyalty; switch freely between services
- **Domain Blacklisting**: Netflix, Facebook actively block temp mail domains
- **Legal Gray Area**: Facilitates fraud/abuse; potential liability

---

## Phase 1: Public Anonymous Inbox

**Effort**: 8h
**Priority**: P1
**Status**: Pending

### Description
Enable zero-click inbox provisioning. Users land on homepage and immediately see a working email address without any registration.

### Key Features
- Auto-generate random address on page load (e.g., `x8k2m@ephemera.email`)
- Persist address in `localStorage` for session recovery
- Real-time inbox updates via existing WebSocket infrastructure
- One-click "Generate New Address" button
- Copy-to-clipboard with visual feedback
- Auto-refresh countdown (10-minute default expiry)

### Technical Tasks

1. **Create Ephemeral Inbox Service** (`services/api/src/services/ephemeral-inbox.service.ts`)
   - `createEphemeralInbox()`: Generate random localPart, assign to public domain
   - `getOrCreateByToken()`: Lookup by session token, create if missing
   - `extendExpiry()`: Reset TTL on user interaction
   - `deleteExpired()`: Cron job to purge old inboxes

2. **Add Ephemeral Routes** (`services/api/src/routes/ephemeral-inbox.ts`)
   - `POST /ephemeral/inbox` - Create new ephemeral inbox
   - `GET /ephemeral/inbox/:token` - Get inbox by session token
   - `POST /ephemeral/inbox/:token/extend` - Extend expiry
   - `DELETE /ephemeral/inbox/:token` - Manual delete

3. **Update Public Inbox Routes** (`services/api/src/routes/public-inbox.ts`)
   - Add ephemeral inbox support to existing message endpoints
   - Differentiate ephemeral vs. permanent inboxes in queries

4. **Frontend: Anonymous Landing Page** (`services/web/src/app/(public)/page.tsx`)
   - Auto-call create endpoint on mount
   - Store token in localStorage
   - Display generated email prominently
   - Integrate with existing inbox viewer component

5. **Cron: Cleanup Expired Inboxes**
   - Run every 5 minutes
   - Delete inboxes + messages older than TTL

### Database Schema Addition
```prisma
model EphemeralInbox {
  id          String   @id @default(uuid())
  token       String   @unique // Session identifier
  localPart   String
  domainId    String
  domain      Domain   @relation(fields: [domainId], references: [id])
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  messages    Message[]
}
```

### Success Criteria
- [ ] User sees working email within 1 second of page load
- [ ] Messages appear in real-time (< 2s latency)
- [ ] Session persists across page refreshes
- [ ] Expired inboxes cleaned up within 10 minutes

---

## Phase 2: Ad Integration

**Effort**: 6h
**Priority**: P2
**Status**: Pending

### Description
Integrate display advertising to monetize free tier traffic. Focus on non-intrusive placements that don't break UX.

### Key Features
- Google AdSense integration (fallback: Carbon Ads for dev audience)
- Strategic ad placements: header banner, sidebar, between messages
- Ad-free detection for premium users
- GDPR/CCPA compliant consent management

### Technical Tasks

1. **Ad Provider Setup**
   - Create AdSense account, get publisher ID
   - Configure ad units (responsive display, in-feed)

2. **Ad Component Library** (`services/web/src/components/ads/`)
   - `AdBanner.tsx` - Header/footer responsive ads
   - `AdSidebar.tsx` - Sidebar sticky ads
   - `AdInFeed.tsx` - Between message list items
   - `AdWrapper.tsx` - Handle loading states, errors

3. **Consent Management** (`services/web/src/components/ads/ConsentBanner.tsx`)
   - Cookie consent popup (GDPR)
   - Store consent in localStorage
   - Block ads until consent given

4. **Premium Detection**
   - Check user tier before rendering ads
   - Skip ads for STARTER+ tiers

### Ad Placement Strategy
| Location | Ad Type | Visibility |
|----------|---------|------------|
| Above inbox | Leaderboard (728x90) | Always |
| Sidebar | Medium Rectangle (300x250) | Desktop only |
| After 5th message | In-feed native | Mobile + Desktop |
| Message detail footer | Banner | Always |

### Revenue Projection
- Estimated CPM: $1-3
- Daily pageviews (conservative): 10,000
- Monthly ad revenue: $300-900

### Success Criteria
- [ ] Ads load without blocking page render
- [ ] No ads shown to premium users
- [ ] Consent collected before tracking
- [ ] < 100ms impact on LCP

---

## Phase 3: Premium Tiers & Payments

**Effort**: 8h
**Priority**: P2
**Status**: Pending

### Description
Leverage existing tier system to upsell premium features. Focus on pain points: email expiry, domain blocks, ads.

### Key Features
- Upsell prompts at friction points
- Premium domain pool (clean, unblocked)
- Extended retention (30 days vs 10 minutes)
- Custom aliases
- Ad-free experience

### Technical Tasks

1. **Premium Domain Management**
   - Tag domains as `isPremium` in database
   - Route premium users to premium domain pool
   - Monitor domain reputation (manual process initially)

2. **Upsell Triggers** (`services/web/src/components/upsell/`)
   - `ExpiryWarning.tsx` - "Upgrade to keep emails 30 days"
   - `BlockedDomainAlert.tsx` - "This domain is blocked by X. Upgrade for clean domains"
   - `AdFreePrompt.tsx` - Subtle "Remove ads" link

3. **Tier Feature Gating**
   - Update `tier-limits.service.ts` to include:
     - `ephemeralRetentionMinutes`: 10 (FREE) vs 43200 (STARTER+)
     - `premiumDomains`: false (FREE) vs true (STARTER+)
     - `customAliases`: 0 (FREE) vs 5/10/unlimited

4. **Payment Flow Enhancement**
   - Add quick upgrade CTA on landing page
   - One-click upgrade from upsell modals
   - Leverage existing SePay integration

### Pricing Structure
| Tier | Price | Key Features |
|------|-------|--------------|
| FREE | $0 | 10-min expiry, ads, shared domains |
| STARTER | $3/mo | 30-day retention, ad-free, 5 aliases |
| PROFESSIONAL | $8/mo | Premium domains, 10 aliases, API access |

### Success Criteria
- [ ] Upsell shown after 3+ inbox views
- [ ] Premium users get clean domains only
- [ ] Conversion rate tracked per upsell trigger

---

## Phase 4: Browser Extension

**Effort**: 12h
**Priority**: P3
**Status**: Pending

### Description
Chrome/Firefox extension for auto-filling temp emails in signup forms. Primary retention mechanism.

### Key Features
- Auto-detect email input fields
- One-click generate + fill
- Popup inbox viewer
- Sync with web account (if logged in)
- Keyboard shortcut (Ctrl+Shift+E)

### Technical Tasks

1. **Extension Architecture**
   - Manifest V3 (Chrome) / WebExtension (Firefox)
   - Content script for form detection
   - Background service worker for API calls
   - Popup UI (React, shared components)

2. **Form Detection** (`extension/src/content/form-detector.ts`)
   - Scan for `input[type="email"]`
   - Inject "Use Ephemera" button next to field
   - Handle dynamic forms (MutationObserver)

3. **Popup Inbox** (`extension/src/popup/`)
   - Mini inbox viewer (last 5 messages)
   - Quick copy current address
   - Generate new address button
   - Link to full web inbox

4. **API Integration**
   - Use ephemeral inbox endpoints
   - Sync session token with web localStorage

5. **Store Submission**
   - Chrome Web Store listing
   - Firefox Add-ons listing
   - Privacy policy page

### Success Criteria
- [ ] Works on top 100 signup forms (Google, Facebook, Netflix)
- [ ] < 50ms injection latency
- [ ] 4+ star rating on stores

---

## Revenue Projections

| Timeline | Free Users | Paid Users | Ad Revenue | Sub Revenue | Total MRR |
|----------|------------|------------|------------|-------------|-----------|
| Month 1 | 5,000 | 50 | $150 | $200 | $350 |
| Month 3 | 20,000 | 200 | $600 | $800 | $1,400 |
| Month 6 | 50,000 | 500 | $1,500 | $2,000 | $3,500 |
| Month 12 | 100,000 | 1,000 | $3,000 | $5,000 | $8,000 |

**Assumptions**: 1% free-to-paid conversion, $3 avg subscription, $1.5 CPM

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Domain blacklisting | High | High | Rotate domains, premium pool |
| Ad revenue decline | Medium | Medium | Diversify with subscriptions |
| Competitor SEO dominance | High | High | Focus on UX differentiation |
| Abuse/fraud complaints | Medium | Medium | Rate limiting, CAPTCHA for high-risk |
| Legal liability | High | Low | Clear ToS, automated content scanning |

---

## Next Steps

1. Start Phase 1 immediately (highest impact)
2. Set up AdSense account in parallel
3. Prepare premium domain pool (acquire 3-5 clean domains)
4. Design upsell UI mockups before Phase 3
