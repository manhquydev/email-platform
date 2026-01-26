# Phase 5: Referral & Community Features

## Context Links

- Backend: `services/api/src/services/referral.service.ts`
- Settings: `services/web/src/pages/Settings.tsx`

## Overview

| Field | Value |
|-------|-------|
| Priority | P3 |
| Status | Pending |
| Effort | 4h |

Referral program UI and community features from Phase 6 of Ephemera Master Plan.

## Key Insights

- Referral codes are hash-based (privacy-first)
- Double-blind rewards: +10 aliases for both parties
- Code format: XXXX-XXXX-XXXX
- Stats tracked via audit logs

## Requirements

### Functional

#### Referral Section
- View personal referral code
- Copy referral link
- See referral stats (count, pending, claimed)
- Claim pending rewards

#### Community Section
- Feature voting (if implemented)
- Community links (Discord, GitHub)
- Contribution badges

### Non-Functional

- Shareable referral links
- Social sharing buttons
- Real-time reward updates

## Architecture

```
Settings Page
└── ReferralSection (new tab or section)
    ├── ReferralCode (display + copy)
    ├── ShareButtons (Twitter, Discord, Email)
    ├── ReferralStats
    └── ClaimRewards

/community → CommunityPage (optional)
    ├── FeatureVoting
    ├── ContributorBadges
    └── CommunityLinks
```

## Related Code Files

### Create

- `services/web/src/pages/settings-modules/referral-section.tsx`
- `services/web/src/services/referralService.ts`
- `services/web/src/components/social/ShareButtons.tsx` (optional)

### Modify

- `services/web/src/pages/Settings.tsx` - Add referral section/tab

## Implementation Steps

### Step 1: Create Referral Service (0.5h)

```typescript
// services/web/src/services/referralService.ts
export const referralService = {
  getCode: () => api('/api/referral/code', { token }),
  getStats: () => api('/api/referral/stats', { token }),
  claimRewards: () => api('/api/referral/claim', { method: 'POST', token }),
  applyCode: (code) => api('/api/referral/apply', { method: 'POST', body: { code }, token }),
};
```

### Step 2: Create Referral Section Component (2h)

```tsx
// referral-section.tsx
export function ReferralSection() {
  // - Fetch referral code
  // - Display code prominently
  // - Copy button for code
  // - Generate share link: `${window.location.origin}/register?ref=CODE`
  // - Share buttons (optional)
  // - Stats display
  // - Claim button if pending > 0
}
```

Features:
- Large, copyable referral code
- Share link generator
- Stats cards (referrals, pending, claimed)
- Claim rewards button with animation

### Step 3: Integrate with Settings Page (1h)

- Add as new tab or section
- Lazy load referral content
- Handle empty state (no referrals yet)

### Step 4: Add Registration Referral Input (0.5h)

- Check URL for `?ref=` param
- Show referral code in registration form
- Apply on successful registration

## Todo List

- [ ] Create referralService.ts
- [ ] Create referral-section.tsx
- [ ] Add ShareButtons component (optional)
- [ ] Integrate with Settings page
- [ ] Add referral input to registration
- [ ] Test code generation
- [ ] Test claim rewards flow
- [ ] Test referral application

## Success Criteria

- [ ] Referral code displays correctly
- [ ] Copy to clipboard works
- [ ] Share link generates properly
- [ ] Stats show accurate counts
- [ ] Claim rewards works
- [ ] Referral applies on registration

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend routes missing | High | Verify API endpoints exist |
| Self-referral attempt | Low | Backend prevents |
| Reward calculation wrong | Medium | Backend handles logic |

## Security Considerations

- Codes are one-way hashes (can't reverse)
- Self-referral prevented on backend
- Rate limiting on code generation

## Next Steps

1. Verify backend referral routes exist at `/api/referral/*`
2. Consider gamification (leaderboard, badges)
3. Add notification for successful referral

## Unresolved Questions

1. Are backend referral routes exposed? (Service exists but routes may not)
2. Should there be a dedicated referral landing page?
3. Community features (voting, badges) - backend support?
