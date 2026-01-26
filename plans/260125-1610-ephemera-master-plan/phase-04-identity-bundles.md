# Phase 4: Identity Suite Bundles

**Effort**: 10h | **Priority**: P1 | **Week**: 4-5

## Overview
Proton-style ecosystem play - expand beyond email to full identity protection.

## Key Features
- Permanent email aliases with forwarding
- Breach monitoring (HIBP integration)
- Privacy score dashboard
- Bundle pricing tiers

## Technical Tasks

### 1. Alias System Enhancement (4h)
**File**: `services/api/src/services/alias.service.ts`
- Permanent aliases (not ephemeral)
- Two-way forwarding (reply via alias)
- Custom alias: `myname@ephemera.email`
- Enable/disable without deletion
- Forward to real email (encrypted storage)

### 2. Breach Monitoring (3h)
**File**: `services/api/src/services/breach-monitor.service.ts`
- Integrate Have I Been Pwned API
- Monitor user's real email (opt-in, encrypted)
- Cron job for periodic checks (daily)
- Alert via email/push on new breaches
- Breach history dashboard

### 3. Privacy Score Dashboard (2h)
**File**: `services/web/src/app/privacy-score/`
- Score calculation (0-100):
  - Alias usage: +20 points
  - No breaches: +30 points
  - Tracking blocked: +25 points
  - 2FA enabled: +25 points
- Visual progress bars
- "Improve score" recommendations
- Gamification badges

### 4. Bundle Pricing Integration (1h)
**File**: `services/api/src/services/subscription.service.ts`
- Update tier limits for bundles
- Feature flags per tier
- Upgrade prompts at limit hits

## Bundle Tiers
| Tier | Price | Features |
|------|-------|----------|
| Shield | $5/mo | 50 aliases, forwarding |
| Guard | $15/mo | + Breach monitoring + unlimited AI |
| Pro | $30/mo | + Data broker removal + priority |

## Success Criteria
- [ ] Alias forwarding < 5s latency
- [ ] Breach alerts within 24h of HIBP update
- [ ] Privacy score visible on dashboard
- [ ] Bundle purchases working via Stripe/SePay
