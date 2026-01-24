---
title: "Phase 5: Accessibility & Performance Audit"
status: completed
priority: P2
effort: 2h
---

# Phase 5: Accessibility & Performance Audit

## Context Links
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Mobile UX Research - Accessibility Q](./research/researcher-mobile-email-ux.md)

## Overview
Final audit phase ensuring WCAG 2.2 compliance and performance benchmarks. No new features; fixes and optimizations only.

## Parallelization Info
- **Can run parallel with:** None (final audit)
- **Depends on:** Phase 4
- **File ownership:** Read-only audit; fixes applied to any file

## Key Insights
- Touch targets: WCAG requires 44x44px minimum
- Focus indicators: Must be visible (not just outline)
- Screen reader: All interactive elements need labels
- Performance: React-virtuoso already handles list; check bundle

## Requirements

### Functional
- All interactive elements keyboard accessible
- Screen reader announces message details
- Focus trapped in modals (command palette, bottom sheet)

### Non-Functional
- Lighthouse accessibility score >= 95
- LCP < 2.5s, FID < 100ms, CLS < 0.1
- Bundle size increase < 10KB from baseline

## Audit Checklist

### Accessibility (WCAG 2.2 AA)
| Criterion | Check | Status |
|-----------|-------|--------|
| 1.3.1 Info & Relationships | Semantic HTML (article, section) | [x] |
| 1.4.3 Contrast | 4.5:1 text, 3:1 UI | [x] |
| 2.1.1 Keyboard | All actions via keyboard | [x] |
| 2.4.7 Focus Visible | Strong focus ring | [x] |
| 2.5.5 Target Size | 44x44px minimum | [x] |
| 4.1.2 Name, Role, Value | aria-labels on buttons | [x] |

### Performance
| Metric | Target | Check |
|--------|--------|-------|
| Lighthouse Performance | >= 90 | [x] |
| Lighthouse Accessibility | >= 95 | [x] |
| LCP | < 2.5s | [x] |
| FID | < 100ms | [x] |
| CLS | < 0.1 | [x] |
| Bundle increase | < 10KB | [x] |

## Related Code Files

### Audit (all inbox-viewer files)
- `services/web/src/pages/InboxViewer.tsx`
- `services/web/src/pages/inbox-viewer-modules/*`
- `services/web/src/components/inbox-viewer/*`
- `services/web/src/hooks/use-keyboard-navigation.ts`

## Implementation Steps

1. **Run Lighthouse audit**
   ```bash
   npx lighthouse http://localhost:3000/inbox-viewer --view
   ```
   - Note all accessibility issues
   - Note all performance issues

2. **Fix accessibility issues**
   - Add missing aria-labels
   - Ensure focus indicators visible
   - Add skip-to-content link
   - Verify heading hierarchy (h1 > h2 > h3)

3. **Fix contrast issues**
   - Check zinc-600 text on black (may fail)
   - Adjust to zinc-400 minimum for body text

4. **Add focus trap to modals**
   ```tsx
   // In command-palette.tsx and mobile-bottom-sheet.tsx
   import { FocusTrap } from '@headlessui/react';
   ```

5. **Test with screen reader**
   - VoiceOver (macOS): Cmd+F5
   - NVDA (Windows): Free download
   - Verify message list announces correctly

6. **Performance optimizations**
   - Lazy load command palette
   - Preconnect to API domain
   - Check for unnecessary re-renders

7. **Bundle analysis**
   ```bash
   npx vite-bundle-visualizer
   ```
   - Identify large dependencies
   - Code-split if needed

## Todo List
- [x] Run Lighthouse accessibility audit
- [x] Fix all accessibility issues found
- [x] Verify 44px touch targets
- [x] Add aria-labels to icon buttons
- [x] Test keyboard navigation flow
- [x] Test with screen reader
- [x] Add focus trap to modals
- [x] Run Lighthouse performance audit
- [x] Optimize bundle if needed
- [x] Document final scores

## Success Criteria
- [x] Lighthouse accessibility >= 95
- [x] Lighthouse performance >= 90
- [x] All WCAG 2.2 AA criteria pass
- [x] Screen reader experience is usable
- [x] No console accessibility warnings

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Contrast failures | Adjust zinc palette |
| Bundle bloat | Lazy load new components |
| Focus trap library size | Use native inert attribute |

## Security Considerations
- Ensure no sensitive data exposed to screen readers unintentionally
- Review aria-labels for information disclosure

## Next Steps
After Phase 5 complete:
1. Update `docs/project-changelog.md` with UX upgrade
2. Create PR for code review
3. Deploy to staging for QA
