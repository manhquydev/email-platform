# Phase 04: Integration & Testing

## Overview
- **Priority:** P1
- **Status:** ✅ Done (2026-01-24)
- **Effort:** 4h

Integrate 3D scene vào LandingPage và thực hiện testing.

## Implementation Steps

### 1. Update LandingPage
```tsx
// pages/LandingPage.tsx
import { LazyLanding3DScene } from '../components/three-d/lazy-landing-scene'

export function LandingPage() {
  // ... existing code

  return (
    <div className="landing neo-mesh-bg overflow-x-hidden">
      <SEOHead ... />

      {/* Replace CSS background with 3D scene */}
      <LazyLanding3DScene />

      {/* Keep existing sections */}
      <HeroSection />
      <FeaturesSection />
      ...
    </div>
  )
}
```

### 2. Remove Old Background Effects
Remove or keep as fallback:
```tsx
// Comment out or remove
{/* <div className="landing-bg fixed inset-0 z-0 ..."> */}
```

### 3. Testing Checklist

#### Visual Tests
- [ ] 3D scene renders behind hero content
- [ ] Text remains readable over 3D background
- [ ] Colors match brand guidelines
- [ ] Animations are smooth

#### Performance Tests
- [ ] Lighthouse performance score > 80
- [ ] FPS stable at 60 on desktop
- [ ] No memory leaks (check heap)
- [ ] Bundle size increase < 200KB

#### Compatibility Tests
- [ ] Chrome/Firefox/Safari desktop
- [ ] Mobile fallback works on iOS/Android
- [ ] `prefers-reduced-motion` works
- [ ] WebGL context loss handled

### 4. Bundle Size Check
```bash
npm run build
# Check dist/assets for new chunks
```

## Todo List
- [ ] Update LandingPage component
- [ ] Remove/refactor old background
- [ ] Run visual regression tests
- [ ] Run Lighthouse audit
- [ ] Test on real mobile devices
- [ ] Document any issues found

## Success Criteria
- Integration complete without breaking changes
- All tests pass
- Performance metrics met
- Mobile fallback works correctly

## Files to Modify
- `services/web/src/pages/LandingPage.tsx`
- `services/web/src/pages/landing-page-modules/hero-section.tsx` (z-index adjustments)

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Bundle size too large | Use dynamic imports, code splitting |
| Mobile performance | Already handled with fallback |
| WebGL crashes | Context loss handler + fallback |
