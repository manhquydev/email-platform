---
phase: 3
title: "Integrate Hero Section"
status: pending
priority: P1
effort: 1h
---

# Phase 03: Integrate Hero Section

## Context Links
- [Phase 02](./phase-02-create-hero-inbox-widget.md) - widget component
- [hero-section.tsx](../../services/web/src/pages/landing-page-modules/hero-section.tsx) - target file

## Overview
Replace generic CTA buttons in HeroSection with HeroInboxWidget, restructure layout for "instant value" pattern.

## Key Insights
- Current hero has 4 CTA links: Try now, Get started, Docs, Inbox viewer
- Replace "Try now" position with widget
- Keep secondary CTAs (register, docs) but make them smaller
- Terminal preview stays, moves further down

## Requirements

### Functional
- Widget appears between subheadline and secondary CTAs
- Widget above 3D scene layer
- Maintain existing trust badge and terminal preview

### Non-Functional
- Smooth layout transition
- No layout shift on widget state change
- Preserve existing animations

## Architecture

```
HeroSection (updated)
├── Version Badge
├── Headline
├── Subheadline
├── HeroInboxWidget ← NEW (primary CTA replacement)
├── Secondary CTAs (register, docs) ← reduced prominence
├── Trust Badge
└── TerminalPreview
```

## Related Code Files

### Modify
- `services/web/src/pages/landing-page-modules/hero-section.tsx`

## Implementation Steps

1. Import HeroInboxWidget:
   ```typescript
   import { HeroInboxWidget } from './components/hero-inbox-widget';
   ```
2. Restructure CTA section:
   - Remove "Try now" and "Inbox viewer" buttons
   - Insert `<HeroInboxWidget />` in prominent position
   - Keep "Get started" and "Docs" as secondary, smaller buttons
3. Layout adjustments:
   ```tsx
   {/* Primary: Inbox Widget */}
   <div className="neo-animate-fade-in-up neo-stagger-3">
     <HeroInboxWidget />
   </div>

   {/* Secondary CTAs */}
   <div className="flex gap-3 justify-center mt-6">
     <Link to="/register" className="...smaller styles...">Get Started</Link>
     <Link to="/docs" className="...smaller styles...">Docs</Link>
   </div>
   ```
4. Ensure z-index layering:
   - Add `relative z-20` to widget container
   - Test against 3D background
5. Adjust spacing:
   - Widget: `mb-6`
   - Secondary CTAs: smaller height (h-10 vs h-12)
6. Preserve animations:
   - Widget container gets `neo-animate-fade-in-up neo-stagger-3`
   - Secondary CTAs get `neo-stagger-4`
7. Test mobile layout:
   - Widget full width
   - Secondary CTAs side-by-side or stacked

## Todo List
- [ ] Import HeroInboxWidget
- [ ] Remove old primary CTAs
- [ ] Insert widget in layout
- [ ] Adjust secondary CTA styling
- [ ] Set z-index for 3D scene layering
- [ ] Adjust spacing/margins
- [ ] Verify animation stagger order
- [ ] Test mobile responsiveness
- [ ] Visual QA on desktop/mobile

## Success Criteria
- Widget visible and functional in hero
- Secondary CTAs accessible
- No overlap with 3D scene
- Mobile layout works
- Animations play correctly

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Widget overlaps 3D elements | z-index testing, pointer-events |
| Layout shift on load | Fixed height container for widget |
| Breaks existing hero look | Iterative visual QA |

## Security Considerations
- No new security concerns

## Next Steps
- Phase 04: Refactor standalone EphemeralInbox page
