# Ephemera Layout Specifications - Version C

> **Companion to:** `docs/design-system-version-c.md`
> **Purpose:** Define page structure, grid systems, and component arrangement patterns.

---

## Page Type Templates

### 1. Landing Page (Public)

```
┌─────────────────────────────────────────────────────────┐
│ Nav (h-14, fixed, border-b border-zinc-900)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Hero Section (py-24, max-w-3xl mx-auto)                │
│  - H1 centered, text-5xl                                │
│  - Subtext text-zinc-400                                │
│  - CTA buttons centered                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Feature Section (py-24, max-w-6xl mx-auto)             │
│  - divide-y divide-zinc-900 (list style)                │
│  - OR grid-cols-3 gap-6 (card style)                    │
├─────────────────────────────────────────────────────────┤
│  Pricing Section (py-24)                                │
│  - grid-cols-3 gap-px (dense cards)                     │
├─────────────────────────────────────────────────────────┤
│ Footer (py-12, border-t border-zinc-900)                │
└─────────────────────────────────────────────────────────┘
```

**Specs:**
- Container: `max-w-6xl` (1152px) for wide sections
- Narrow: `max-w-3xl` (768px) for text-heavy content
- Section spacing: `py-24` (96px vertical)
- Mobile: Stack all columns, `py-16`

---

### 2. Auth Page (Login/Register)

```
┌─────────────────────────────────────────────────────────┐
│                    bg-black (full screen)               │
│                                                         │
│           ┌─────────────────────────────┐               │
│           │  Logo (mb-8)                │               │
│           │  Card (max-w-md, p-8)       │               │
│           │  ┌─────────────────────┐    │               │
│           │  │ Title (text-2xl)    │    │               │
│           │  │ Subtitle (zinc-500) │    │               │
│           │  │ Form Inputs         │    │               │
│           │  │ Primary Button      │    │               │
│           │  │ Footer Links        │    │               │
│           │  └─────────────────────┘    │               │
│           └─────────────────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Specs:**
- Container: `max-w-md` (448px), centered
- Card: `bg-zinc-950 border border-zinc-800 rounded-lg p-8`
- Input gap: `space-y-4`
- No navigation, minimal footer links only

---

### 3. Dashboard (App Shell)

```
┌─────────────────────────────────────────────────────────┐
│ Header (h-14, border-b border-zinc-900, sticky)         │
├───────────┬─────────────────────────────────────────────┤
│           │                                             │
│  Sidebar  │  Main Content Area                          │
│  w-64     │  (flex-1, p-6)                              │
│  fixed    │                                             │
│  left-0   │  ┌─────────────────────────────────────┐    │
│           │  │ Page Header                         │    │
│  Nav      │  │ (border-b border-zinc-900, pb-6)    │    │
│  Links    │  ├─────────────────────────────────────┤    │
│           │  │ Content Grid / List                 │    │
│  border-r │  │                                     │    │
│  zinc-900 │  └─────────────────────────────────────┘    │
│           │                                             │
└───────────┴─────────────────────────────────────────────┘
```

**Specs:**
- Sidebar: `w-64` (256px) fixed, `bg-zinc-950`
- Main: `ml-64 flex-1`
- Header: `h-14` (56px), sticky top-0
- Content padding: `p-6`
- Mobile: Sidebar → hamburger drawer

---

### 4. Admin Panel

```
┌─────────────────────────────────────────────────────────┐
│ Admin Header (h-14, bg-zinc-950)                        │
├───────────┬─────────────────────────────────────────────┤
│           │ Page Title Bar                              │
│  Admin    │ (py-4, border-b border-zinc-900)            │
│  Sidebar  ├─────────────────────────────────────────────┤
│  w-64     │ Stats Grid (grid-cols-4 gap-4)              │
│           │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  Links:   │ │Stat│ │Stat│ │Stat│ │Stat│                 │
│  - Users  │ └────┘ └────┘ └────┘ └────┘                 │
│  - Packs  ├─────────────────────────────────────────────┤
│  - Codes  │ Data Table (full width)                     │
│  - Stats  │ ┌─────────────────────────────────────────┐ │
│           │ │ thead (bg-zinc-900)                     │ │
│           │ │ tbody (divide-y divide-zinc-900)        │ │
│           │ └─────────────────────────────────────────┘ │
└───────────┴─────────────────────────────────────────────┘
```

**Specs:**
- Stats cards: `grid-cols-4 gap-4` (desktop), `grid-cols-2` (tablet)
- Table: Full width, `border border-zinc-800 rounded-lg overflow-hidden`
- Row height: `py-3` (48px effective)
- Action buttons: Reveal on row hover

---

### 5. Settings Page

```
┌─────────────────────────────────────────────────────────┐
│ App Header (inherited from Dashboard)                   │
├───────────┬─────────────────────────────────────────────┤
│  App      │ Settings Container (max-w-4xl)              │
│  Sidebar  │                                             │
│           │ ┌─────────┬───────────────────────────────┐ │
│           │ │ Tabs    │ Content Panel                 │ │
│           │ │ w-48    │ (flex-1, p-6)                 │ │
│           │ │         │                               │ │
│           │ │ General │ Form Sections                 │ │
│           │ │ Profile │ (space-y-8)                   │ │
│           │ │ Security│                               │ │
│           │ │ Billing │ ┌─────────────────────────┐   │ │
│           │ │         │ │ Section Title           │   │ │
│           │ │         │ │ Description             │   │ │
│           │ │         │ │ Form Fields (space-y-4) │   │ │
│           │ │         │ └─────────────────────────┘   │ │
│           │ └─────────┴───────────────────────────────┘ │
└───────────┴─────────────────────────────────────────────┘
```

**Specs:**
- Settings nav: `w-48` (192px), vertical tabs
- Content max-width: `max-w-2xl` (672px) for forms
- Section gap: `space-y-8`
- Field gap: `space-y-4`
- Mobile: Tabs → horizontal scroll or dropdown

---

## Grid System

### Breakpoints
| Name | Width | Columns | Gutter |
|------|-------|---------|--------|
| Mobile | <640px | 1 | 16px |
| Tablet | 640-1024px | 2-6 | 24px |
| Desktop | >1024px | 12 | 24px |

### Container Widths
```css
max-w-sm   /* 384px  - Modals */
max-w-md   /* 448px  - Auth forms */
max-w-lg   /* 512px  - Small modals */
max-w-xl   /* 576px  - Medium forms */
max-w-2xl  /* 672px  - Settings content */
max-w-3xl  /* 768px  - Narrow content */
max-w-4xl  /* 896px  - Settings container */
max-w-5xl  /* 1024px - Medium layouts */
max-w-6xl  /* 1152px - Wide layouts */
max-w-7xl  /* 1280px - Admin full width */
```

---

## Component Arrangement

### Card Grid Patterns
```tsx
// 3-column features
<div className="grid md:grid-cols-3 gap-6">

// 4-column stats
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

// 2-column settings
<div className="grid md:grid-cols-2 gap-6">
```

### List Patterns
```tsx
// Divider list (preferred for features)
<div className="divide-y divide-zinc-900">
  <div className="py-6">Item</div>
</div>

// Spaced list (for navigation)
<div className="space-y-1">
  <a className="block px-3 py-2">Link</a>
</div>
```

---

## UI State Patterns

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-12 h-12 text-zinc-700 mb-4" />
  <h3 className="text-lg font-medium text-white mb-2">No items yet</h3>
  <p className="text-sm text-zinc-500 mb-6 max-w-sm">
    Get started by creating your first item.
  </p>
  <button className="px-4 py-2 bg-white text-black rounded-md">
    Create Item
  </button>
</div>
```

### Loading States
```tsx
// Skeleton (matches content layout)
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-zinc-800 rounded w-3/4" />
  <div className="h-4 bg-zinc-800 rounded w-1/2" />
</div>

// Button loading
<button disabled className="opacity-50 cursor-not-allowed">
  <Spinner className="w-4 h-4 mr-2 animate-spin" />
  Loading...
</button>
```

### Error States
```tsx
// Inline form error
<div className="mt-1.5 text-sm text-red-400">
  Email is required
</div>

// Toast notification
<div className="fixed bottom-6 right-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
  <p className="text-sm text-white">Error message</p>
</div>
```

---

## Responsive Behavior

### Sidebar Collapse
| Viewport | Sidebar | Behavior |
|----------|---------|----------|
| Desktop (>1024px) | Visible, w-64 | Fixed position |
| Tablet (768-1024px) | Collapsed, w-16 | Icons only |
| Mobile (<768px) | Hidden | Hamburger → Drawer |

### Content Stacking
| Component | Desktop | Mobile |
|-----------|---------|--------|
| Feature grid | 3 cols | 1 col stacked |
| Pricing cards | 3 cols | 1 col stacked |
| Stats grid | 4 cols | 2 cols |
| Settings | Side nav + content | Stacked tabs |

---

## File Reference

| Document | Purpose |
|----------|---------|
| `docs/design-system-version-c.md` | Colors, typography, components |
| `docs/design-guidelines.md` | Quick reference cheat sheet |
| `docs/layout-specifications.md` | This file - layouts & arrangement |
| `services/web/src/pages/mockups/MockupVersionC.tsx` | Reference implementation |
