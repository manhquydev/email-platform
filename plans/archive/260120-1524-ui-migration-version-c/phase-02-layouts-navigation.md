# Phase 2: Layouts & Navigation

> **Status:** Pending | **Priority:** Critical | **Est. Time:** 4-5 hours

## Overview

Update all layout components and navigation to Version C design. This cascades to all pages.

## Files to Modify

| File | Priority | Description |
|------|----------|-------------|
| `layouts/PublicLayout.tsx` | Critical | Public pages wrapper |
| `layouts/AuthLayout.tsx` | Critical | Login/Register wrapper |
| `layouts/MainLayout.tsx` | Critical | App pages wrapper |
| `components/Navigation.tsx` | Critical | Main nav component |
| `components/SiteFooter.tsx` | High | Footer component |
| `components/Navigation/DesktopNav.tsx` | High | Desktop navigation |
| `components/Navigation/MobileNav.tsx` | High | Mobile navigation |
| `components/AppHeader.tsx` | High | App header |

## Key Changes

### Navigation Pattern
```tsx
// FROM (current)
<nav className="bg-nebula-surface border-b border-nebula-border">

// TO (Version C)
<nav className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-sm border-b border-zinc-900">
  <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
```

### Nav Links
```tsx
// FROM
<a className="text-nebula-text-secondary hover:text-nebula-text">

// TO
<a className="text-sm text-zinc-500 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">
```

### Footer Pattern
```tsx
// TO
<footer className="border-t border-zinc-900 py-8 px-6">
  <div className="max-w-6xl mx-auto flex items-center justify-between">
    <span className="text-sm text-zinc-600">© 2024 Ephemera</span>
```

### Layout Wrapper
```tsx
// TO
<div className="min-h-screen bg-black text-white">
  <Navigation />
  <main>{children}</main>
  <Footer />
</div>
```

## Todo List

- [ ] Update PublicLayout.tsx
- [ ] Update AuthLayout.tsx
- [ ] Update MainLayout.tsx
- [ ] Update Navigation.tsx
- [ ] Update DesktopNav.tsx
- [ ] Update MobileNav.tsx
- [ ] Update SiteFooter.tsx
- [ ] Update AppHeader.tsx
- [ ] Test all layouts render correctly

## Success Criteria

- [ ] All layouts use bg-black background
- [ ] Navigation follows Version C pattern
- [ ] Footer is minimal with zinc-900 border
- [ ] No visual regressions

## Next Steps

→ Phase 3: Public Pages
