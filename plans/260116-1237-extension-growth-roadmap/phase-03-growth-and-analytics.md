# Phase 3: Growth & Analytics

**Priority:** P2 | **Effort:** 10h | **Status:** Pending

## Overview

Enable data-driven decisions with analytics. Improve user acquisition and retention through onboarding and sharing features. QR codes bridge desktop-to-mobile gap.

## Requirements

### Analytics Implementation (4h)
- [ ] Implement `/extension/analytics` endpoint in backend
- [ ] Track key events: install, inbox_create, message_view, feature_use
- [ ] Add session tracking with anonymous user ID
- [ ] Create analytics dashboard view (internal)
- [ ] Respect user privacy preferences

### Onboarding Flow (3h)
- [ ] First-install detection via storage flag
- [ ] 3-step onboarding tooltip tour:
  1. "Create your first inbox"
  2. "Auto-fill on any website"
  3. "Use Side Panel for quick access"
- [ ] Skip option and "Don't show again" checkbox
- [ ] Track onboarding completion rate

### QR Code Sharing (2h)
- [ ] Add "Show QR" button to inbox card actions
- [ ] Generate QR code with inbox address
- [ ] Modal display with download option
- [ ] Use lightweight QR library (qrcode-generator, ~3KB)

### Referral Hooks (1h)
- [ ] Add "Share Ephemera" button in settings
- [ ] Copy referral link with UTM parameters
- [ ] Track referral source in analytics

## Implementation Steps

1. Create analytics event types in `shared/analytics.ts`
2. Implement `trackEvent()` function with batching (send every 30s or 10 events)
3. Create `components/OnboardingTour.tsx` with step state
4. Add first-install check in `popup/App.tsx`
5. Integrate qrcode-generator library
6. Create `components/QRCodeModal.tsx`
7. Add share functionality to Settings component

## Success Criteria

- [ ] Analytics events successfully sent to backend
- [ ] Onboarding shown to 100% of new installs
- [ ] Onboarding completion rate tracked
- [ ] QR code scannable on mobile devices
- [ ] Bundle size increase <10KB

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Analytics endpoint not ready | High | High | Stub analytics, queue events locally |
| Privacy concerns with tracking | Medium | Medium | Clear privacy policy, opt-out option |
| QR library bloats bundle | Low | Low | Use minimal library, lazy load |

## Dependencies

- **Backend:** `POST /extension/analytics` endpoint (BLOCKING)
- **Phase 1:** Error handling for failed analytics calls
- **Phase 2:** Feature usage events depend on new features

## Deliverables

- Updated `shared/analytics.ts` with real implementation
- `components/OnboardingTour.tsx`
- `components/QRCodeModal.tsx`
- Analytics event schema documentation
