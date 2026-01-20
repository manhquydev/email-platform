# Ephemera Design Guidelines

> **Version C: Superhuman** - Ultra-minimal, keyboard-first, maximum contrast.
> Reference: `docs/design-system-version-c.md` for complete specification.

---

## Quick Reference

### Color Palette (Semantic Tokens)
Use these semantic classes mapped to Version C CSS variables.

| Class | Value | Usage |
|-------|-------|-------|
| `bg-v3-bg-primary` | `#000000` | Page background |
| `bg-v3-bg-elevated` | `#09090b` | Elevated sections, modals |
| `bg-v3-bg-surface` | `#18181b` | Cards, inputs |
| `bg-v3-bg-hover` | `#27272a` | Interactive hover states |
| `border-v3-border-default` | `#27272a` | Standard borders |
| `text-v3-text-primary` | `#ffffff` | Headings, emphasis |
| `text-v3-text-secondary` | `#a1a1aa` | Body text |
| `text-v3-accent-success` | `#34d399` | Success states |

### Typography
| Element | Classes |
|---------|---------|
| H1 | `text-5xl md:text-6xl font-bold tracking-tight text-v3-text-primary` |
| H2 | `text-3xl font-bold text-v3-text-primary` |
| H3 | `text-lg font-medium text-v3-text-primary` |
| Body | `text-sm text-v3-text-secondary` |
| Mono | `font-mono text-sm` |

### Border Radius
```
rounded-v3-sm    /* 4px - badges */
rounded-v3-md    /* 6px - buttons */
rounded-v3-lg    /* 8px - cards (MAX) */
```

### Spacing
```
py-24 px-6   /* sections */
p-6          /* cards */
h-14         /* nav height */
gap-6        /* grid gaps */
```

---

## Component Patterns

### Primary Button
```tsx
<button className="px-5 py-2.5 bg-v3-accent-primary text-black rounded-v3-md font-medium hover:bg-zinc-200 transition-colors">
```

### Secondary Button
```tsx
<button className="px-5 py-2.5 border border-v3-border-default hover:border-v3-border-strong text-v3-text-secondary hover:text-v3-text-primary rounded-v3-md transition-colors">
```

### Input
```tsx
<input className="w-full px-4 py-3 bg-v3-bg-surface border border-v3-border-default rounded-v3-lg text-v3-text-primary placeholder:text-v3-text-muted focus:border-v3-border-strong focus:ring-1 focus:ring-v3-border-strong" />
```

### Card
```tsx
<div className="p-6 bg-v3-bg-elevated border border-v3-border-default rounded-v3-lg">
```

### Nav Link
```tsx
<a className="text-sm text-v3-text-muted hover:text-v3-text-primary px-3 py-1.5 rounded-v3-md hover:bg-v3-bg-surface transition-colors">
```

---

## Rules

### DO ✅
- Use `bg-v3-bg-primary` for main backgrounds
- Use `border-v3-border-default` for dividers
- Pure black (#000) background
- Zinc color palette only
- Border-based elevation
- Lists over card grids
- Monospace for code/emails
- Transitions ≤ 200ms
- Border radius ≤ 8px

### DON'T ❌
- Gradients on backgrounds
- Multiple accent colors
- Shadows on cards
- Glassmorphism effects
- Glow/blur effects
- Rounded-xl or larger
- Animation > 200ms

---

## File Reference

| File | Purpose |
|------|---------|
| `docs/design-system-version-c.md` | Complete specification |
| `services/web/src/pages/mockups/MockupVersionC.tsx` | Reference implementation |

---

## Migration Checklist

When updating a page:
- [ ] Change `bg-slate-*` → `bg-zinc-*`
- [ ] Change `bg-[dark]` → `bg-black`
- [ ] Remove gradient backgrounds
- [ ] Remove glow/blur effects
- [ ] Update buttons to white/border style
- [ ] Reduce border-radius to max 8px
- [ ] Use `transition-colors` only
- [ ] Verify zinc text hierarchy
