---
phase: 2
title: "Create HeroInboxWidget Component"
status: pending
priority: P1
effort: 1.5h
---

# Phase 02: Create HeroInboxWidget Component

## Context Links
- [Phase 01](./phase-01-extract-ephemeral-hook.md) - hook dependency
- [hero-section.tsx](../../services/web/src/pages/landing-page-modules/hero-section.tsx) - target location
- [Research: Temp Email Patterns](../reports/researcher-260126-1849-temp-email-homepage-patterns.md)

## Overview
Create compact inbox widget for hero section with two states: generation CTA and active inbox display.

## Key Insights
- TempMail pattern: Large email address, one-click copy, inbox below
- Must work above 3D scene (z-index)
- Mobile: 50%+ traffic, 44px touch targets minimum
- Visual feedback: toast on copy, pulse on new message

## Requirements

### Functional
- State 1 (No Inbox): "Generate Email" button
- State 2 (Active): Address display + Copy + Mini message list (3 items max)
- "View Full Inbox" link to `/e/:token`
- Timer showing expiry countdown

### Non-Functional
- Nebula Glass design tokens
- Responsive: stack vertically on mobile
- Animations: fade-in, glow effects

## Architecture

```
HeroInboxWidget
├── useEphemeralInbox({ autoCreate: false })
├── State: idle | loading | active
├── Components:
│   ├── GenerateButton (idle state)
│   ├── AddressDisplay + CopyButton (active)
│   ├── ExpiryTimer (active)
│   └── MiniMessageList (active, max 3)
└── Link: "View Full Inbox" → /e/:token
```

## Related Code Files

### Create
- `services/web/src/pages/landing-page-modules/components/hero-inbox-widget.tsx`

### Modify
- `services/web/src/pages/landing-page-modules/index.ts` (add export)

## Implementation Steps

1. Create directory: `landing-page-modules/components/`
2. Create `hero-inbox-widget.tsx`:
   ```typescript
   export function HeroInboxWidget() {
     const { inbox, messages, isCreating, createInbox, token } = useEphemeralInbox({
       autoCreate: false,
       persistKey: 'hero_ephemeral_token'
     });
     // On mount: check localStorage, if token exists, auto-load
   }
   ```
3. Implement idle state:
   - Glassmorphism container
   - "Generate Random Email" button with bolt icon
   - Subtle glow animation
4. Implement active state:
   - Large address text (text-xl sm:text-2xl)
   - Copy button with clipboard icon
   - Toast on copy: "Copied!"
   - Expiry countdown (mm:ss or "Xh Xm")
5. Implement mini message list:
   - Max 3 messages
   - Sender + Subject truncated
   - "No messages yet" empty state with pulse animation
6. Add "View Full Inbox" link:
   ```tsx
   <Link to={`/e/${token}`}>View Full Inbox →</Link>
   ```
7. Style with Nebula tokens:
   - `bg-nebula-surface/80`, `backdrop-blur-xl`
   - `border-nebula-border`, `shadow-nebula-glow`
   - Hover states, focus rings
8. Mobile responsiveness:
   - Full width on mobile
   - Copy button min-height 44px
   - Stack layout

## Todo List
- [ ] Create components directory
- [ ] Create hero-inbox-widget.tsx
- [ ] Implement idle/generate state
- [ ] Implement active state with address
- [ ] Add copy functionality with toast
- [ ] Add expiry countdown timer
- [ ] Add mini message list
- [ ] Style with Nebula Glass tokens
- [ ] Test mobile responsiveness
- [ ] Export from index.ts

## Success Criteria
- Widget renders in isolation
- Generate creates inbox and shows address
- Copy works with visual feedback
- Messages display in mini-list
- Link navigates to full page

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| z-index below 3D scene | Use z-20+ and test |
| Copy API not available | Fallback: select text |
| Touch targets too small | Enforce 44px min |

## Security Considerations
- No sensitive data displayed
- Token in URL is public by design

## Next Steps
- Phase 03: Integrate widget into HeroSection
