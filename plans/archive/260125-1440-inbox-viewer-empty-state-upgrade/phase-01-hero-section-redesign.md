# Phase 1: Hero Section Redesign

## Context
- [Plan Overview](./plan.md)
- [Empty State Patterns](../reports/researcher-260125-1440-empty-state-ui-patterns.md)
- [Email Landing Trends](../reports/researcher-260125-1440-email-landing-page-trends.md)

## Overview
**Priority:** High
**Status:** Pending
**Description:** Transform basic SearchForm into immersive hero section

## Key Insights
- Mailinator/TempMail pattern: Hero = App itself
- Value-first headlines outperform feature descriptions
- Large, centered input with prominent CTA

## Requirements

### Functional
- Email input field centered in viewport
- High-contrast "Go" button
- Keyboard shortcut hint (Enter)
- Error validation inline

### Non-Functional
- Time-to-input < 1s
- Mobile-first responsive
- 60fps animations

## Architecture
```
InboxViewer.tsx
  └── InboxHeroSection (NEW)
        ├── HeroHeadline
        ├── HeroSubtext
        ├── HeroSearchInput (enhanced SearchForm)
        └── TrustBadges
```

## Related Code Files
**Modify:**
- `services/web/src/pages/InboxViewer.tsx` (lines 103-106)
- `services/web/src/components/inbox-viewer/search-form.tsx`

**Create:**
- `services/web/src/components/inbox-viewer/inbox-hero-section.tsx`

## Implementation Steps
1. Create `inbox-hero-section.tsx` component
2. Add headline: "Xem hộp thư công khai tức thì"
3. Add subtext: "Nhập địa chỉ email để kiểm tra hộp thư - không cần đăng nhập"
4. Enhance input field styling (larger, glow effect)
5. Update InboxViewer.tsx to use new component
6. Add staggered entrance animation

## Todo List
- [ ] Create inbox-hero-section.tsx
- [ ] Style hero headline (text-4xl md:text-5xl)
- [ ] Enhanced input with glow border
- [ ] Integrate into InboxViewer
- [ ] Test responsive layout

## Success Criteria
- Input field prominently centered
- Headline visible above fold on all devices
- Smooth entrance animation

## Risk Assessment
- Breaking existing SearchForm props → Maintain backward compat
- Animation performance → Use CSS transforms only
