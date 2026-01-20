# Ephemera Design System - Version C (Superhuman)

> **Canonical reference** for all UI implementation across the platform.
> Style: Ultra-minimal, keyboard-first, maximum contrast, developer-focused.

---

## Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Restraint** | Remove everything unnecessary. If in doubt, leave it out. |
| **Contrast** | Pure black (#000) background, white text. No gray backgrounds. |
| **Density** | Information-rich layouts. Lists over cards. |
| **Speed** | Performance is design. Animations < 150ms. |
| **Keyboard-first** | Every action accessible via keyboard. |

---

## Color Palette

### Backgrounds
```css
--bg-primary: #000000;      /* Pure black - main background */
--bg-elevated: #09090b;     /* zinc-950 - sections, modals */
--bg-surface: #18181b;      /* zinc-900 - cards, inputs */
--bg-hover: #27272a;        /* zinc-800 - hover states */
```

### Borders
```css
--border-subtle: #18181b;   /* zinc-900 - subtle dividers */
--border-default: #27272a;  /* zinc-800 - card borders */
--border-strong: #3f3f46;   /* zinc-700 - focus, emphasis */
```

### Text
```css
--text-primary: #ffffff;    /* White - headings, important */
--text-secondary: #a1a1aa;  /* zinc-400 - body text */
--text-muted: #71717a;      /* zinc-500 - secondary info */
--text-disabled: #52525b;   /* zinc-600 - disabled, hints */
```

### Accent (Use Sparingly)
```css
--accent-primary: #ffffff;  /* White - primary buttons */
--accent-success: #34d399;  /* emerald-400 - success, active */
--accent-error: #f87171;    /* red-400 - errors only */
--accent-warning: #fbbf24;  /* amber-400 - warnings only */
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Scale
| Element | Size | Weight | Tracking | Line Height |
|---------|------|--------|----------|-------------|
| H1 (Hero) | 3.75rem (60px) | 700 | -0.025em | 1.1 |
| H2 (Section) | 1.875rem (30px) | 700 | -0.02em | 1.2 |
| H3 (Card) | 1.125rem (18px) | 500 | normal | 1.3 |
| Body | 0.875rem (14px) | 400 | normal | 1.5 |
| Small | 0.75rem (12px) | 500 | normal | 1.4 |
| Mono | 0.875rem (14px) | 400 | 0.02em | 1.5 |

### Rules
- Headings: tight letter-spacing (-0.02em)
- Body: zinc-400, never pure white
- Monospace: for code, emails, commands, OTP
- NO uppercase except tiny labels (tracking-wider)

---

## Spacing

### Base: 4px
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-24: 6rem;     /* 96px */
```

### Component Spacing
| Context | Padding |
|---------|---------|
| Button sm | 6px 12px |
| Button md | 10px 20px |
| Input | 16px |
| Card | 24px |
| Section | 96px vertical |
| Nav height | 56px (h-14) |

---

## Border Radius

```css
--radius-none: 0;
--radius-sm: 4px;     /* Badges, tags */
--radius-md: 6px;     /* Buttons, inputs */
--radius-lg: 8px;     /* Cards, dropdowns */
```

### Rules
- Buttons: 6px (rounded-md)
- Cards: 8px (rounded-lg)
- Inputs: 8px (rounded-lg)
- NO rounded-full except avatars
- NO rounded-2xl or larger

---

## Shadows

### Minimal Shadow System
```css
/* Almost no shadows - rely on borders */
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.5);  /* Rare - dropdowns only */
```

### Rules
- Prefer borders over shadows
- NO glow effects except focus states
- NO gradient shadows

---

## Components

### Buttons

```tsx
// Primary - White bg (1 per section max)
<button className="px-5 py-2.5 bg-white text-black rounded-md font-medium
  hover:bg-zinc-200 transition-colors">
  Get Started
</button>

// Secondary - Border only
<button className="px-5 py-2.5 border border-zinc-800 hover:border-zinc-700
  text-zinc-300 rounded-md transition-colors">
  Learn more
</button>

// Ghost - Text only
<button className="px-3 py-1.5 text-zinc-400 hover:text-white
  hover:bg-zinc-900 rounded-md transition-colors">
  Cancel
</button>
```

### Inputs

```tsx
<input className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800
  rounded-lg text-white placeholder:text-zinc-600
  focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700
  transition-colors" />
```

### Cards

```tsx
// Standard card - border emphasis
<div className="p-6 bg-zinc-950 border border-zinc-800 rounded-lg">
  {/* content */}
</div>

// Elevated card (featured)
<div className="p-6 bg-zinc-900 rounded-lg relative">
  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r
    from-transparent via-white to-transparent" />
  {/* content */}
</div>
```

### Navigation

```tsx
<nav className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-sm
  border-b border-zinc-900">
  <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
    {/* Logo + Links + Actions */}
  </div>
</nav>
```

### Lists (Preferred over cards)

```tsx
<div className="divide-y divide-zinc-900">
  <div className="py-6 flex items-start justify-between gap-8 group">
    <div className="flex-1">
      <h3 className="text-lg font-medium text-white
        group-hover:text-emerald-400 transition-colors">
        Feature title
      </h3>
      <p className="text-sm text-zinc-500">Description</p>
    </div>
    <ChevronRightIcon className="w-5 h-5 text-zinc-700
      group-hover:text-zinc-400 transition-colors" />
  </div>
</div>
```

### Tags/Badges

```tsx
// Status badge
<span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/10
  text-emerald-400 rounded">
  NEW
</span>

// Category tag
<span className="px-2 py-0.5 text-xs font-medium bg-zinc-900
  text-zinc-500 rounded">
  Core
</span>
```

### Keyboard Hints

```tsx
<div className="flex items-center gap-2 text-xs text-zinc-600">
  <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800
    font-mono">⌘</kbd>
  <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800
    font-mono">K</kbd>
  <span>to open command palette</span>
</div>
```

---

## Layout Patterns

### Page Structure
```tsx
<div className="min-h-screen bg-black text-white">
  <nav className="h-14 border-b border-zinc-900" />
  <main>
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Narrow content - 768px */}
      </div>
    </section>
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Wide content - 1152px */}
      </div>
    </section>
  </main>
  <footer className="border-t border-zinc-900 py-8" />
</div>
```

### Max Widths
```css
--max-w-narrow: 48rem;   /* 768px - text content */
--max-w-medium: 64rem;   /* 1024px - mixed content */
--max-w-wide: 72rem;     /* 1152px - full layouts */
```

---

## Animation

### Timing
| Interaction | Duration | Easing |
|-------------|----------|--------|
| Color change | 150ms | ease (transition-colors) |
| All properties | 200ms | ease (transition-all) |

### Rules
- ONLY use `transition-colors` or `transition-all`
- NO bounce, spring, or elastic
- NO animations > 200ms
- Respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}
```

---

## Tailwind Classes Quick Reference

### Common Patterns
```
Background:     bg-black, bg-zinc-950, bg-zinc-900
Border:         border-zinc-900, border-zinc-800, border-zinc-700
Text:           text-white, text-zinc-400, text-zinc-500, text-zinc-600
Hover text:     hover:text-white, hover:text-emerald-400
Hover bg:       hover:bg-zinc-900, hover:bg-zinc-800
Rounded:        rounded (4px), rounded-md (6px), rounded-lg (8px)
Transition:     transition-colors (preferred), transition-all
```

---

## Anti-Patterns (NEVER DO)

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `bg-slate-*` | `bg-zinc-*` |
| `rounded-xl`, `rounded-2xl` | `rounded-lg` max |
| Gradients on backgrounds | Solid colors |
| Multiple accent colors | White + Emerald only |
| Shadow-heavy cards | Border-based cards |
| Glassmorphism panels | Solid dark panels |
| Glow effects | Subtle border changes |
| Animated backgrounds | Static black |

---

## Checklist Before Shipping

- [ ] Background is pure black (#000000)
- [ ] Text hierarchy uses zinc-400/500/600
- [ ] Buttons use white bg or border-only
- [ ] Cards use border, no shadows
- [ ] Border radius ≤ 8px
- [ ] Transitions ≤ 200ms
- [ ] Monospace for code/emails
- [ ] Focus states visible
- [ ] Mobile responsive
- [ ] No gradient backgrounds
