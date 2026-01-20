# Phase 3: Public Pages

> **Status:** Pending | **Priority:** High | **Est. Time:** 6-8 hours

## Overview

Migrate all public-facing marketing pages to Version C design.

## Files to Modify

| File | Priority | Modules |
|------|----------|---------|
| `pages/LandingPage.tsx` | Critical | hero-section, features-section, api-section, pricing-section, faq-cta-sections |
| `pages/Features.tsx` | High | - |
| `pages/Pricing.tsx` | High | - |
| `pages/API.tsx` | High | api-modules/api-components |
| `pages/Docs.tsx` | Medium | docs-modules/docs-sections |
| `pages/Support.tsx` | Medium | - |
| `pages/Legal/*.tsx` | Low | TermsOfService, PrivacyPolicy, AcceptableUse, GDPR |
| `pages/ErrorPage.tsx` | Medium | - |

## Landing Page Modules

### hero-section.tsx
```tsx
// Key changes:
- Remove gradient backgrounds
- Remove animated blobs/orbs
- Use command-palette style email demo
- White primary button
```

### features-section.tsx
```tsx
// Key changes:
- Convert card grid to list style
- Remove glassmorphism
- Add hover:text-emerald-400 for feature titles
- Use divide-y divide-zinc-900
```

### pricing-section.tsx
```tsx
// Key changes:
- Dense pricing cards with gap-px
- White gradient line on featured plan
- Bullet points with colored dots
```

## Common Patterns

### Section Header
```tsx
<div className="mb-12">
  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
    Features
  </span>
  <h2 className="text-3xl font-bold mt-2">Built for speed</h2>
</div>
```

### Feature List Item
```tsx
<div className="py-6 flex items-start justify-between gap-8 group">
  <div className="flex-1">
    <h3 className="text-lg font-medium text-white group-hover:text-emerald-400">
      {title}
    </h3>
    <p className="text-sm text-zinc-500">{desc}</p>
  </div>
  <ChevronRightIcon className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400" />
</div>
```

## Todo List

- [ ] Update LandingPage.tsx
- [ ] Update hero-section.tsx
- [ ] Update features-section.tsx
- [ ] Update api-section.tsx
- [ ] Update pricing-section.tsx
- [ ] Update faq-cta-sections.tsx
- [ ] Update Features.tsx
- [ ] Update Pricing.tsx
- [ ] Update API.tsx and modules
- [ ] Update Docs.tsx and modules
- [ ] Update Support.tsx
- [ ] Update Legal pages (4 files)
- [ ] Update ErrorPage.tsx

## Success Criteria

- [ ] No gradient backgrounds on any page
- [ ] All text uses zinc hierarchy
- [ ] Buttons follow Version C pattern
- [ ] Consistent section spacing (py-24)

## Next Steps

→ Phase 4: Auth Pages
