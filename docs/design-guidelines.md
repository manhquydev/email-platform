# Ephemera Design Guidelines

## Design Systems

This project uses **two coexisting design token systems**:

1. **Semantic Design System (Phase 1+)** — New, Notion-inspired, light-first palette. Use for all newly designed components and pages.
2. **Version C (Legacy)** — Ultra-minimal, keyboard-first, dark-only. Remains for out-of-scope pages during migration.

---

## Semantic Design System (New — Phase 1+)

### 2-Layer Token Architecture

**Layer 1: Primitives** (`src/styles/primitives.css`)
- Raw color values only, no theme awareness
- Notion-inspired warm-gray neutral scale + brand blue accent (`#3B82F6`)
- Examples: `--color-neutral-50`, `--color-blue-500`, `--color-green-500`
- **Do not use directly in components** — reference via semantic tokens

**Layer 2: Semantic Tokens** (`src/styles/semantic-tokens.css`)
- Purpose-named tokens referencing primitives
- Light theme at `:root`, dark overrides in `.dark { }` selector
- Matches Tailwind's `darkMode: 'class'` wiring (`.dark` class toggled by `ThemeContext`)
- Examples: `--semantic-bg-primary`, `--semantic-text-main`, `--semantic-accent`

### Color Palette (Semantic Classes)

| Category | Tailwind Classes | Usage |
|----------|------------------|-------|
| **Backgrounds** | `bg-semantic-bg-primary` | Main page/surface backgrounds |
| | `bg-semantic-bg-secondary` | Secondary surfaces (e.g., grouped sections) |
| | `bg-semantic-bg-hover` | Interactive hover states |
| | `bg-semantic-bg-selected` | Selected/active backgrounds |
| **Text** | `text-semantic-text-main` | Primary text, headings |
| | `text-semantic-text-secondary` | Secondary text, descriptions |
| | `text-semantic-text-muted` | Disabled, placeholder text |
| **Borders** | `border-semantic-border` | Standard dividers |
| | `border-semantic-border-hover` | Hover state borders |
| | `border-semantic-border-strong` | Emphasis borders |
| **Accent** | `bg-semantic-accent`, `text-semantic-accent` | Brand blue, primary actions |
| | `bg-semantic-accent-subtle` | Soft accent backgrounds |
| **Status** | `text-semantic-success`, `text-semantic-warning`, `text-semantic-danger` | Semantic colors |
| | `bg-semantic-{success,warning,danger}-subtle` | Status backgrounds |

### Dark Mode Behavior

Both themes render correctly via the `.dark` class toggle (no action needed in components):
```tsx
// Light mode (default)
<button className="bg-semantic-bg-primary text-semantic-text-main">Light</button>

// Dark mode (automatic when .dark class on root)
<button className="bg-semantic-bg-primary text-semantic-text-main">Dark</button>
```

### Component Patterns

**Button (Primary)**
```tsx
<button className="px-4 py-2 bg-semantic-accent text-white rounded-md font-medium hover:bg-semantic-accent-hover transition-colors">
  Action
</button>
```

**Button (Secondary)**
```tsx
<button className="px-4 py-2 border border-semantic-border text-semantic-text-main rounded-md hover:bg-semantic-bg-hover transition-colors">
  Cancel
</button>
```

**Input**
```tsx
<input className="w-full px-3 py-2 bg-semantic-bg-secondary border border-semantic-border rounded-md text-semantic-text-main placeholder:text-semantic-text-muted focus:border-semantic-border-strong focus:ring-1 focus:ring-[var(--semantic-focus-ring)]" />
```

**Card**
```tsx
<div className="p-4 bg-semantic-bg-secondary border border-semantic-border rounded-lg shadow-semantic-md">
  {/* card content */}
</div>
```

**Badge**
```tsx
import { Badge } from '../components/ui/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Error</Badge>
```

**Table** (Phase 6 primitive)
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '../components/ui/Table';

<Table>
  <TableCaption>DNS records for example.com</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Record Type</TableHead>
      <TableHead>Value</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>MX</TableCell>
      <TableCell>mail.example.com</TableCell>
      <TableCell><Badge variant="success">Verified</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```
Use for read-only data display (DNS records, payment history, logs). Semantic `<table>` markup with `<th scope="col">` — **not** an interactive grid pattern. See Phase 6 plan, red-team finding #12.

**Tabs** (Phase 6 primitive)
```tsx
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '../components/ui/Tabs';

<Tabs activeId={activeTab} onChange={setActiveTab}>
  <TabsList aria-label="Settings sections">
    <TabsTrigger id="general">General</TabsTrigger>
    <TabsTrigger id="security">Security</TabsTrigger>
    <TabsTrigger id="billing">Billing</TabsTrigger>
  </TabsList>
  <TabsPanel id="general">{/* General settings */}</TabsPanel>
  <TabsPanel id="security">{/* Security settings */}</TabsPanel>
  <TabsPanel id="billing">{/* Billing settings */}</TabsPanel>
</Tabs>
```
Controlled compound component. Caller owns `activeId` state (e.g., for URL `?tab=` sync). Includes keyboard navigation (arrow keys, Home/End). Proper ARIA tablist/tab/tabpanel semantics.

### Token Namespaces in Tailwind

```javascript
// colors.semantic (in tailwind.config.js)
semantic: {
  'bg-primary': 'var(--semantic-bg-primary)',
  'text-main': 'var(--semantic-text-main)',
  'accent': 'var(--semantic-accent)',
  // ... more tokens
},

// shadows.semantic
shadows: {
  'semantic-sm': 'var(--semantic-shadow-sm)',
  'semantic-md': 'var(--semantic-shadow-md)',
  'semantic-lg': 'var(--semantic-shadow-lg)',
}
```

---

## Version C: Superhuman (Legacy)

> Use **only** for pages not covered by the redesign phases. For new work, use the Semantic system above.
> Reference: `docs/design-system-version-c.md` for complete specification.

### Color Palette (v3-* Classes)

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

### Border Radius (v3-*)
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

## Usage Rules

### Semantic System (New Work) — DO ✅
- Use `semantic-*` classes for all redesigned pages/components
- Theme-aware: tokens automatically adapt to `.dark` class without component changes
- Compose variants programmatically (e.g., Badge's `variant` prop) rather than inline classes
- Use semantic shadows: `shadow-semantic-sm`, `shadow-semantic-md`, `shadow-semantic-lg`
- Prefer soft, minimal shadows (Notion-style) — `semantic-shadow-md` for cards, `semantic-shadow-lg` for modals
- Border radius: keep ≤ 8px per existing conventions

### Semantic System — DON'T ❌
- Don't mix `semantic-*` with `v3-*` or `nebula-*` classes in the same component
- Don't use primitives directly (e.g., avoid `bg-blue-500`); use semantic tokens instead
- Don't hardcode color hex values; use CSS variables
- Don't create new component-level CSS vars; reuse semantic tokens
- Don't assume light mode only — always test dark theme via `ThemeContext`

### Version C (Legacy) — DO ✅
- Use `v3-*` classes only for pages/components **not yet redesigned**
- Check `services/web/plans/*/plan.md` to see which pages are in-scope for redesign
- Dark mode only (no light theme variants)
- Maximum contrast, keyboard-first interactions

### Version C — DON'T ❌
- Don't add new features to Version C pages — redesign them instead
- Don't mix `v3-*` with `semantic-*` in the same component

---

## File Reference

| File | Purpose |
|------|---------|
| `services/web/src/styles/primitives.css` | Raw color values (Notion palette) |
| `services/web/src/styles/semantic-tokens.css` | Purpose-named tokens, light + dark |
| `services/web/src/components/ui/Badge.tsx` | Badge primitive (status labels) |
| `services/web/src/components/ui/Table.tsx` | Table primitive (read-only data display) |
| `services/web/src/components/ui/Tabs.tsx` | Tabs primitive (multi-section navigation) |
| `services/web/src/hooks/use-tabs-keyboard-nav.ts` | Keyboard navigation for Tabs (arrow keys, Home/End) |
| `docs/design-system-version-c.md` | Version C (Legacy) full spec |
| `services/web/plans/260711-1108-notion-inspired-post-login-redesign/phase-01-design-system-foundation.md` | Phase 1 implementation details |

---

## Migration Path (Phases)

The redesign is structured in 6 phases. All phases complete as of Phase 6 (2026-07-11):

1. **Phase 1** (Complete) — Design system foundation: tokens, Badge, Modal, Button, Input, Dropdown, GlassCard, AppShell
2. **Phase 2** (Complete) — Inbox reading and management
3. **Phase 3** (Complete) — Additional pages
4. **Phase 4** (Complete) — Performance & theming
5. **Phase 5** (Complete) — Component migration
6. **Phase 6** (Complete) — Settings tabs: all 10 settings pages restyled + Table & Tabs primitives

Old `v3-*`/`nebula-*` tokens remain **indefinitely** for out-of-scope pages (172 files across codebase). No single "cutoff" — pages migrate as their phase lands.
