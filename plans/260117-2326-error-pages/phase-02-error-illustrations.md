# Phase 02: Error Illustrations

## Context Links
- [Plan](./plan.md)
- [Phase 01](./phase-01-i18n-setup.md)

## Overview

Create custom SVG illustrations for each error type (404, 403, 500, 503) matching the glassmorphism design language used throughout the platform.

## Key Insights

- Existing UI uses glassmorphism: backdrop-blur, semi-transparent backgrounds, CSS variables
- ErrorBoundary has inline SVG warning icon - follow similar pattern
- SVGs should be React components for easy theming and animation

## Requirements

1. Create 4 unique SVG illustrations as React components
2. Use CSS variables for theming compatibility (--color-primary, --color-danger, etc.)
3. Support dark/light themes via currentColor or CSS vars
4. Keep SVGs optimized (<5KB each)
5. Add subtle animations (optional, via Framer Motion)

## Architecture

```
services/web/src/components/illustrations/
├── index.ts                    # Re-exports
├── Error404Illustration.tsx    # Lost/searching concept
├── Error403Illustration.tsx    # Lock/forbidden concept
├── Error500Illustration.tsx    # Broken/crash concept
└── Error503Illustration.tsx    # Maintenance/construction concept
```

**Component Pattern:**
```tsx
interface IllustrationProps {
  className?: string;
  size?: number;
}

export function Error404Illustration({ className, size = 200 }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      fill="none"
    >
      {/* Glassmorphism-styled SVG elements */}
    </svg>
  );
}
```

## Related Code Files

- `services/web/src/components/ErrorBoundary.tsx` - Existing SVG example
- `services/web/src/index.css` - CSS variables

## Implementation Steps

1. Create `illustrations/` directory
2. Create Error404Illustration.tsx - magnifying glass searching void
3. Create Error403Illustration.tsx - shield with lock
4. Create Error500Illustration.tsx - broken server/gears
5. Create Error503Illustration.tsx - maintenance crane/tools
6. Create index.ts with re-exports
7. Test in Storybook or isolation

## Design Concepts

| Code | Concept | Elements |
|------|---------|----------|
| 404 | Lost in space | Astronaut, question marks, floating elements |
| 403 | Access denied | Shield, padlock, barrier |
| 500 | System error | Broken gears, glitchy elements |
| 503 | Under maintenance | Construction, tools, progress |

## Todo List

- [ ] Create illustrations directory
- [ ] Design and implement Error404Illustration
- [ ] Design and implement Error403Illustration
- [ ] Design and implement Error500Illustration
- [ ] Design and implement Error503Illustration
- [ ] Create index.ts barrel export
- [ ] Test theme compatibility (dark/light)

## Success Criteria

- [ ] All 4 illustrations render correctly
- [ ] Colors adapt to theme via CSS variables
- [ ] SVGs optimized and performant
- [ ] Visually consistent with platform aesthetic

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Design inconsistency | Medium | Medium | Reference existing UI components |
| Large SVG file size | Low | Low | Use SVGO optimization |

## Security Considerations

- Static SVGs with no user input - no security concerns

## Next Steps

Proceed to Phase 03 (ErrorPage Component) after illustrations are ready.
