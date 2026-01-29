---
phase: 5
title: "Styling and Polish"
status: pending
priority: P2
effort: 1.5h
---

# Phase 05: Styling and Polish

## Context Links
- [Phase 02](./phase-02-create-hero-inbox-widget.md) - widget component
- [Phase 03](./phase-03-integrate-hero-section.md) - hero integration
- [Research: Temp Email UX](../reports/researcher-260126-1849-temp-email-homepage-patterns.md)

## Overview
Final polish: mobile responsiveness, animations, visual feedback, and edge case handling.

## Key Insights
- 50%+ mobile traffic expected
- Touch targets: minimum 44px
- Visual feedback critical: copy confirmation, new message notification
- 3D scene touch interaction must not interfere

## Requirements

### Functional
- New message notification (subtle pulse/badge)
- Copy confirmation toast
- Expiry warning when < 5 min remaining
- QR code for mobile transfer (optional, stretch goal)

### Non-Functional
- 60fps animations
- No layout shift
- Accessible (ARIA labels, focus states)
- Dark theme consistent

## Architecture

```
Polish Areas
├── HeroInboxWidget
│   ├── Copy feedback animation
│   ├── New message pulse
│   ├── Expiry warning state
│   └── Mobile touch optimization
├── HeroSection
│   ├── z-index finalization
│   └── Animation timing
└── Global
    ├── toast styling
    └── accessibility audit
```

## Related Code Files

### Modify
- `services/web/src/pages/landing-page-modules/components/hero-inbox-widget.tsx`
- `services/web/src/pages/landing-page-modules/hero-section.tsx`
- Possibly: `services/web/src/styles/` for new animations

## Implementation Steps

### Mobile Responsiveness
1. Test widget on 320px, 375px, 414px viewports
2. Ensure copy button is thumb-reachable
3. Address field: truncate with ellipsis if needed
4. Message list: horizontal scroll or stack

### Animations
1. Add copy button feedback:
   ```css
   .copy-success { animation: pulse-green 0.3s ease-out; }
   ```
2. New message indicator:
   - Subtle glow pulse on widget border
   - Badge count on mini-list
3. Widget appear animation:
   - Fade in + slight scale (0.95 → 1.0)

### Visual Feedback
1. Copy action:
   - Button icon changes to checkmark for 2s
   - Toast: "Copied to clipboard!"
2. Expiry warning:
   - When < 5 min: timer text turns amber
   - When < 1 min: timer text turns red + pulse
3. Empty state:
   - "Waiting for emails..." with animated dots
   - Subtle inbox icon pulse

### Accessibility
1. Add ARIA labels:
   - `aria-label="Copy email address"`
   - `aria-live="polite"` on message list
2. Focus states:
   - Visible focus ring on all interactive elements
3. Screen reader:
   - Announce new messages

### 3D Scene Coordination
1. Verify `pointer-events: none` on 3D canvas doesn't block widget
2. Test touch events on mobile
3. Ensure widget has `pointer-events: auto`

### Edge Cases
1. Very long email addresses: truncate + tooltip
2. Many messages quickly: debounce notification
3. Network error during create: retry button in widget
4. localStorage disabled: graceful fallback

## Todo List
- [ ] Mobile viewport testing (320px, 375px, 414px)
- [ ] Touch target sizing (44px minimum)
- [ ] Copy button feedback animation
- [ ] New message pulse animation
- [ ] Expiry warning states (amber/red)
- [ ] Empty state animation
- [ ] ARIA labels for accessibility
- [ ] Focus state styling
- [ ] 3D scene pointer-events testing
- [ ] Long address truncation
- [ ] Network error handling in widget
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Performance check (60fps animations)

## Success Criteria
- Lighthouse mobile score > 90
- All touch targets > 44px
- Animations smooth at 60fps
- Screen reader navigable
- Works on iOS Safari and Android Chrome

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Animation jank | Use transform/opacity only |
| 3D blocks touches | pointer-events testing |
| Toast obscures content | Position bottom-center |

## Security Considerations
- No new security concerns

## Next Steps
- Deploy to staging for QA
- Monitor analytics for conversion improvement
