# Phase 7: Cleanup & Polish

> **Status:** Pending | **Priority:** Low | **Est. Time:** 4-6 hours

## Overview

Final cleanup, remove deprecated styles, ensure consistency, and optimize.

## Tasks

### 1. CSS Cleanup

#### Remove/Deprecate Old Styles
- [ ] Review `index.css` - remove unused nebula classes
- [ ] Review `nebula-glass.css` - deprecate or remove
- [ ] Remove glassmorphism utility classes
- [ ] Remove gradient utility classes
- [ ] Remove glow effect classes

#### Consolidate New Styles
- [ ] Ensure `version-c-tokens.css` is complete
- [ ] Create utility classes for common patterns
- [ ] Document any custom CSS needed

### 2. Component Audit

#### Shared Components Check
- [ ] `components/ui/GlassCard.tsx` - Replace or remove
- [ ] `components/ui/Input.tsx` - Update to Version C
- [ ] `components/ui/Dropdown.tsx` - Update styling
- [ ] `components/ConfirmationModal.tsx` - Update modal style
- [ ] `components/Loading.tsx` - Update spinner style

#### Remove Unused Components
- [ ] Identify components no longer used
- [ ] Remove safely with tests

### 3. Consistency Check

#### Color Audit
```bash
# Find remaining slate references
grep -r "slate-" services/web/src/ --include="*.tsx"
grep -r "bg-\[#" services/web/src/ --include="*.tsx"
```

#### Border Radius Audit
```bash
# Find oversized radius
grep -r "rounded-xl\|rounded-2xl\|rounded-3xl" services/web/src/
```

#### Animation Audit
```bash
# Find slow animations
grep -r "duration-\[3\|duration-\[5\|duration-500\|duration-700" services/web/src/
```

### 4. Responsive Testing

- [ ] Test all pages on mobile (375px)
- [ ] Test all pages on tablet (768px)
- [ ] Test all pages on desktop (1280px)
- [ ] Fix any responsive issues

### 5. Dark Mode Verification

- [ ] Ensure all pages work in dark mode
- [ ] No light mode remnants (bg-white on containers)
- [ ] Text contrast meets accessibility standards

### 6. Performance Check

- [ ] Remove unused CSS (PurgeCSS)
- [ ] Check bundle size before/after
- [ ] Verify no heavy animations remain

## Final Checklist

### Design Consistency
- [ ] All backgrounds are black/zinc-950
- [ ] All text uses zinc hierarchy
- [ ] All borders use zinc-800/900
- [ ] All buttons follow pattern
- [ ] All inputs follow pattern
- [ ] All cards follow pattern

### Functionality
- [ ] All pages load correctly
- [ ] All forms submit correctly
- [ ] All modals open/close
- [ ] All navigation works
- [ ] All auth flows work

### Accessibility
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes WCAG AA

## Cleanup Commands

```bash
# Find deprecated classes
grep -rn "nebula-\|neo-\|glass-" services/web/src/ --include="*.tsx" | wc -l

# Find hardcoded colors
grep -rn "bg-\[#\|text-\[#\|border-\[#" services/web/src/ --include="*.tsx"

# Count remaining issues
grep -rn "rounded-xl\|rounded-2xl\|shadow-lg\|shadow-xl" services/web/src/ --include="*.tsx" | wc -l
```

## Success Criteria

- [ ] No deprecated class references
- [ ] All pages visually consistent
- [ ] No console errors
- [ ] Bundle size optimized
- [ ] All tests pass

## Documentation

- [ ] Update `docs/design-guidelines.md` if needed
- [ ] Update `docs/design-system-version-c.md` with learnings
- [ ] Document any exceptions or edge cases
