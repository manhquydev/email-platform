---
title: "Phase 4: Density Controls & Polish"
status: completed
priority: P2
effort: 2h
---

# Phase 4: Density Controls & Polish

## Context Links
- [Desktop UX Research](./research/researcher-desktop-email-ux.md)
- [Design Guidelines](../../docs/design-guidelines.md)

## Overview
Add user-configurable density settings (compact/comfortable) and polish interactions. Sequential phase after Phase 2 and Phase 3.

## Parallelization Info
- **Can run parallel with:** None
- **Depends on:** Phase 2, Phase 3
- **File ownership (EXCLUSIVE):**
  - NEW: `density-context.tsx`
  - `hero-email-address.tsx`
  - `search-form.tsx`

## Key Insights
- Compact: 12-14px font, minimal padding, single-line previews
- Comfortable: 14-16px font, generous whitespace, 2-line snippets
- Store preference in localStorage
- Apply via CSS custom properties or Tailwind variants

## Requirements

### Functional
- Toggle between Compact and Comfortable density
- Density affects: font size, padding, line height, preview lines
- Preference persists across sessions

### Non-Functional
- Instant switch (no page reload)
- CSS-only density changes (no re-render)

## Architecture

### Density Tokens
```css
/* Compact */
--density-padding: 0.5rem;
--density-font-size: 0.75rem;
--density-line-height: 1.25;
--density-preview-lines: 1;

/* Comfortable */
--density-padding: 1rem;
--density-font-size: 0.875rem;
--density-line-height: 1.5;
--density-preview-lines: 2;
```

### Context Structure
```tsx
DensityProvider
├── value: 'compact' | 'comfortable'
├── setDensity: (d) => void
└── localStorage sync
```

## Related Code Files

### Modify
- `services/web/src/components/inbox-viewer/hero-email-address.tsx`
- `services/web/src/components/inbox-viewer/search-form.tsx`

### Create
- `services/web/src/components/inbox-viewer/density-context.tsx`

## Implementation Steps

1. **Create density-context.tsx**
   ```tsx
   type Density = 'compact' | 'comfortable';

   const DensityContext = createContext<{
     density: Density;
     setDensity: (d: Density) => void;
   }>();

   export function DensityProvider({ children }) {
     const [density, setDensity] = useState<Density>(() =>
       localStorage.getItem('inbox-density') as Density || 'comfortable'
     );

     useEffect(() => {
       localStorage.setItem('inbox-density', density);
       document.documentElement.setAttribute('data-density', density);
     }, [density]);

     return <DensityContext.Provider value={{ density, setDensity }}>
       {children}
     </DensityContext.Provider>;
   }
   ```

2. **Add density toggle to toolbar**
   - Icon button in MessageListPane toolbar
   - Toggle between compact/comfortable
   - Show current state with icon change

3. **Update hero-email-address.tsx**
   - Responsive sizing based on density
   - `text-2xl` (comfortable) vs `text-xl` (compact)

4. **Update search-form.tsx**
   - Adjust padding based on density
   - Smaller inputs in compact mode

5. **Add Tailwind data-attribute variants**
   ```js
   // tailwind.config.js
   plugins: [
     plugin(({ addVariant }) => {
       addVariant('compact', '[data-density="compact"] &');
       addVariant('comfortable', '[data-density="comfortable"] &');
     })
   ]
   ```

6. **Apply density classes throughout**
   ```tsx
   className="p-4 compact:p-2 comfortable:p-4"
   className="text-sm compact:text-xs"
   ```

## Todo List
- [x] Create density-context.tsx with localStorage
- [x] Add density toggle button to toolbar
- [x] Create Tailwind data-attribute variants
- [x] Update hero-email-address sizing
- [x] Update search-form padding
- [x] Document density classes in code
- [x] Test persistence across refresh

## Success Criteria
- [x] Toggle switches between compact/comfortable
- [x] Visual difference is noticeable
- [x] Preference persists in localStorage
- [x] No layout shift during toggle
- [x] All components respect density

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Too many density variants | Limit to 2 (compact/comfortable) |
| Tailwind purge removes variants | Safelist data-density classes |
| Layout breaks in compact | Test all components at compact |

## Security Considerations
None - UI preference only.

## Next Steps
Proceed to Phase 5 (Accessibility Audit).
