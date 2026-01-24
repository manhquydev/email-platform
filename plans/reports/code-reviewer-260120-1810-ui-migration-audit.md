## UI Migration Review Report: Version C (Superhuman)

### Summary
The Landing Page and its sub-modules have been successfully migrated to the Version C design language (Black/Zinc/Emerald). However, all standalone pages (Features, Pricing, API, Docs, Support) and most legal pages still retain the old "Nebula" styling (Gradients, Glassmorphism, Violet accents) and require immediate refactoring.

### ✅ Files Passing Review
**Landing Page Ecosystem:**
- `src/pages/LandingPage.tsx`
- `src/pages/landing-page-modules/hero-section.tsx`
- `src/pages/landing-page-modules/features-section.tsx`
- `src/pages/landing-page-modules/api-section.tsx`
- `src/pages/landing-page-modules/pricing-section.tsx`
- `src/pages/landing-page-modules/faq-cta-sections.tsx`

**Legal Pages (Partial):**
- `src/pages/Legal/GDPR.tsx` (Uses `LegalPageLayout`, likely clean, but relies on shared component)

### ❌ Issues Found (Non-Compliant Files)

#### 1. Standalone Pages (`Features.tsx`, `Pricing.tsx`, `API.tsx`, `Docs.tsx`, `Support.tsx`)
- **Issue:** Still use CSS variables `var(--nebula-*)` and `neo-mesh-bg` classes.
- **Issue:** Contain radial gradients and background blur effects (`backdrop-blur`).
- **Issue:** Use Violet/Blue color schemes instead of the strict Zinc/Emerald palette.
- **Issue:** Use `GlassCard` components or custom glass CSS instead of flat `bg-zinc-950 border-zinc-800` cards.

#### 2. Legal Pages (`TermsOfService.tsx`, `PrivacyPolicy.tsx`, `AcceptableUse.tsx`)
- **Issue:** Wrapped in `glass-card` containers with decorative blur blobs.
- **Issue:** Use `animate-nebula-fade-in` and gradient text.
- **Issue:** Should be simple text documents on black backgrounds, similar to the `GDPR.tsx` structure.

#### 3. Utility Pages (`ErrorPage.tsx`)
- **Issue:** Uses `neo-glass-card` and semantic colors (`text-warning`, `text-danger`) instead of the defined palette.

### 🛠 Recommended Fixes

1.  **Remove Global CSS Variables:** Replace all instances of `var(--nebula-*)` with Tailwind utility classes:
    - Background: `bg-black`
    - Surface: `bg-zinc-950`
    - Borders: `border border-zinc-800`
    - Primary Text: `text-white`
    - Secondary Text: `text-zinc-500`
    - Accents: `text-emerald-400` (for all positive/brand actions)

2.  **Flatten UI Components:**
    - Replace `GlassCard` with simple `div` elements having `bg-zinc-950 border border-zinc-800 rounded-lg`.
    - Remove `backdrop-blur-*` and `shadow-*` classes.

3.  **Standardize Layouts:**
    - Refactor `Features.tsx`, `Pricing.tsx`, and `API.tsx` to share the same layout components as the Landing Page modules to ensure consistency (DRY principle).

4.  **Legal Page Standardization:**
    - Update Terms, Privacy, and Acceptable Use pages to use the `LegalPageLayout` component used by `GDPR.tsx`.
