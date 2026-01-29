# UI Migration to Version C (Superhuman)

> **Status:** Planning | **Priority:** High | **Created:** 2026-01-20

## Overview

Migrate entire Ephemera UI from current Nebula Glass design to Version C (Superhuman) - ultra-minimal, keyboard-first, maximum contrast design system.

## Design Reference

| Document | Path |
|----------|------|
| Full Specification | `docs/design-system-version-c.md` |
| Quick Reference | `docs/design-guidelines.md` |
| Reference Implementation | `services/web/src/pages/mockups/MockupVersionC.tsx` |

## Scope Summary

| Category | Count | Files |
|----------|-------|-------|
| **Layouts** | 6 | MainLayout, PublicLayout, AuthLayout, AppShell, FocusStreamLayout, ResponsiveLayout |
| **Pages** | 25+ | Landing, Features, Pricing, Login, Dashboard, Admin, etc. |
| **Components** | 80+ | Navigation, Footer, Cards, Buttons, Inputs, etc. |
| **CSS Files** | 2 major | index.css (~5500 lines), nebula-glass.css (~4400 lines) |

## Phases

| Phase | Name | Status | Priority | Est. Files |
|-------|------|--------|----------|------------|
| 1 | [Foundation](./phase-01-foundation.md) | Complete | Critical | 5 |
| 2 | [Layouts & Navigation](./phase-02-layouts-navigation.md) | Pending | Critical | 8 |
| 3 | [Public Pages](./phase-03-public-pages.md) | Pending | High | 15 |
| 4 | [Auth Pages](./phase-04-auth-pages.md) | Pending | High | 5 |
| 5 | [App Pages](./phase-05-app-pages.md) | Pending | Medium | 20 |
| 6 | [Admin Pages](./phase-06-admin-pages.md) | Pending | Medium | 15 |
| 7 | [Cleanup & Polish](./phase-07-cleanup-polish.md) | Pending | Low | - |

## Key Changes

### Color Migration
```
bg-slate-* → bg-zinc-*
bg-[#0A0F1C] → bg-black
--nebula-* → --v3-* (new tokens)
```

### Border Radius
```
rounded-xl, rounded-2xl → rounded-lg (max 8px)
rounded-full (buttons) → rounded-md
```

### Effects Removal
```
❌ Gradients on backgrounds
❌ Glassmorphism (backdrop-blur on cards)
❌ Glow effects (box-shadow with color)
❌ Animated blobs/orbs
```

### Button Styles
```
Primary: bg-white text-black
Secondary: border border-zinc-800 text-zinc-300
Ghost: text-zinc-400 hover:bg-zinc-900
```

## Dependencies

- Tailwind CSS (already installed)
- No new dependencies required

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing styles | Phase-by-phase migration, test each |
| CSS conflicts | Create new token system, deprecate old |
| Large file changes | Focus on layouts first, cascade down |

## Success Criteria

- [ ] All pages use zinc color palette
- [ ] No gradient backgrounds remain
- [ ] All border-radius ≤ 8px
- [ ] Buttons follow new patterns
- [ ] Transitions ≤ 200ms
- [ ] Visual consistency across all pages
