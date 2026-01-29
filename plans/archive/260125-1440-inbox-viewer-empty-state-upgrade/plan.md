# Inbox Viewer Empty State Upgrade

**Created:** 2026-01-25
**Status:** In Progress
**Branch:** main

## Objective
Upgrade `/inbox-viewer` empty state (before email input) from basic form to immersive, action-oriented hero section following modern SaaS patterns.

## Research Reports
- [Empty State UI Patterns](../reports/researcher-260125-1440-empty-state-ui-patterns.md)
- [Email Landing Page Trends](../reports/researcher-260125-1440-email-landing-page-trends.md)
- [Dark Theme Design Systems](../reports/researcher-260125-1440-dark-theme-design-systems.md)

## Key Design Decisions
1. **"Inbox First" Approach** - Input field IS the hero, not a form
2. **Value-Based Headline** - Outcome-focused ("Xem hộp thư tức thì")
3. **Trust Badges** - "Không cần đăng nhập", "Realtime"
4. **Spotlight Effect** - Cursor-following radial gradient
5. **3D Abstract Illustration** - Floating inbox/envelope visual

## Phases

| # | Phase | Status | Files |
|---|-------|--------|-------|
| 1 | [Hero Section Redesign](./phase-01-hero-section-redesign.md) | Pending | `search-form.tsx`, `InboxViewer.tsx` |
| 2 | [Visual Effects & Animation](./phase-02-visual-effects-animation.md) | Pending | New component |
| 3 | [Trust Badges & Copy](./phase-03-trust-badges-copy.md) | Pending | New component |

## Success Criteria
- [ ] Hero section with centered input field
- [ ] Spotlight/glow effect on hover
- [ ] Trust badges visible
- [ ] Staggered entrance animation
- [ ] Mobile responsive
- [ ] WCAG AA compliant
