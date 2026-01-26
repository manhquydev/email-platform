---
title: "Homepage Ephemeral Inbox Redesign"
description: "Integrate ephemeral inbox widget directly into hero section for instant value"
status: pending
priority: P1
effort: 6h
branch: main
tags: [homepage, ephemeral, ux, hero]
created: 2026-01-26
---

# Homepage Ephemeral Inbox Redesign

## Objective
Transform landing page from "click to try" to "instant value" by embedding live ephemeral inbox in hero section. Pattern: TempMail-style immediate email address visibility on page load.

## Research References
- [Temp Email Homepage Patterns](../reports/researcher-260126-1849-temp-email-homepage-patterns.md)
- [Ephemera Homepage Redesign Analysis](../reports/researcher-260126-1849-ephemera-homepage-redesign-analysis.md)

## Key Insights
1. **Zero-Friction Entry**: Auto-generate address on load, no "Generate" button
2. **Above the Fold**: Address + Copy + Inbox preview must be visible without scroll
3. **localStorage Persistence**: Store token for returning visitors
4. **Unified View**: Homepage = Inbox hero widget

## Phases

| Phase | Title | Status | Effort |
|-------|-------|--------|--------|
| 01 | [Extract useEphemeralInbox Hook](./phase-01-extract-ephemeral-hook.md) | pending | 1h |
| 02 | [Create HeroInboxWidget Component](./phase-02-create-hero-inbox-widget.md) | pending | 1.5h |
| 03 | [Integrate Hero Section](./phase-03-integrate-hero-section.md) | pending | 1h |
| 04 | [Refactor EphemeralInbox Page](./phase-04-refactor-ephemeral-page.md) | pending | 1h |
| 05 | [Styling and Polish](./phase-05-styling-and-polish.md) | pending | 1.5h |

## Dependencies
- `ephemeralService.ts` - existing API layer (no changes needed)
- Nebula Glass design tokens
- 3D scene z-index coordination

## Success Criteria
- [ ] Email address visible immediately on homepage load
- [ ] One-click copy with visual feedback
- [ ] Live message stream in hero widget
- [ ] Mobile responsive (44px touch targets)
- [ ] localStorage token persistence works
- [ ] Existing `/e/:token` page still functional
