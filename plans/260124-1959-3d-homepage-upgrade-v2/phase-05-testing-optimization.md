# Phase 5: Testing & Optimization

## Context Links
- [Scout Report](./scout-report.md) - use-gpu-tier.ts needs upgrade
- [3D Techniques for SaaS](../reports/researcher-02-3d-techniques-saas-260124-1945.md) - mobile concerns

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 2h |

Final polish: upgrade GPU detection, comprehensive testing, performance tuning, accessibility verification.

## Key Insights
- Current GPU detection is basic heuristic (mobile check + WebGL2)
- `detect-gpu` library provides accurate tier 0-3 based on GPU benchmarks
- Chrome DevTools Performance tab shows frame timing
- Spector.js shows draw calls, shader compilation

## Requirements
### Functional
- Accurate GPU tier detection (0=no WebGL, 1=low, 2=medium, 3=high)
- Tier-based feature toggles validated
- Reduced motion preference respected
- CSS fallback works on tier 0-1

### Non-Functional
- 60fps on tier 3 (high-end desktop)
- 30fps minimum on tier 2 (laptop)
- No 3D on tier 0-1 (mobile, old hardware)
- Lighthouse performance score > 90

## Architecture
```
GPU Tier Flow:
detect-gpu → tier 0-3 → feature flags
├── tier 3: all effects, 1000 particles
├── tier 2: no chromatic aberration, 500 particles
├── tier 1: no postprocessing, 200 particles
└── tier 0: CSS fallback only
```

## Related Code Files
### Modify
- `services/web/src/hooks/use-gpu-tier.ts`
- `services/web/src/components/three-d/landing-hero-3d-scene.tsx`
- `services/web/package.json`

### Create
- `services/web/src/components/three-d/__tests__/performance.test.ts` (optional)

## Implementation Steps
1. Install detect-gpu:
   ```bash
   cd services/web && npm install detect-gpu
   ```

2. Upgrade `use-gpu-tier.ts`:
   ```tsx
   import { getGPUTier } from 'detect-gpu'

   export type GPUTier = 0 | 1 | 2 | 3

   export function useGPUTier(): { tier: GPUTier; loading: boolean } {
     const [tier, setTier] = useState<GPUTier>(2) // default medium
     const [loading, setLoading] = useState(true)

     useEffect(() => {
       getGPUTier().then((result) => {
         setTier(result.tier as GPUTier)
         setLoading(false)
       })
     }, [])

     return { tier, loading }
   }
   ```

3. Update scene with tier-based config:
   ```tsx
   const config = {
     0: { particles: 0, postprocessing: false, orbs: false },
     1: { particles: 100, postprocessing: false, orbs: true },
     2: { particles: 500, postprocessing: true, chromatic: false },
     3: { particles: 1000, postprocessing: true, chromatic: true }
   }[tier]
   ```

4. Testing checklist:
   - [ ] Chrome DevTools → Performance → Record scroll interaction
   - [ ] Verify 60fps (16.67ms frame time)
   - [ ] Chrome DevTools → Rendering → FPS meter
   - [ ] Throttle CPU 4x → verify graceful degradation
   - [ ] Mobile emulation → verify CSS fallback
   - [ ] `prefers-reduced-motion` → verify animations stop

5. Lighthouse audit:
   - Run on production build
   - Target: Performance > 90, Accessibility > 95
   - Check LCP not blocked by 3D loading

6. Bundle analysis:
   ```bash
   npm run build -- --analyze
   ```
   - Verify postprocessing chunk < 60KB
   - Verify three.js tree-shaking works

7. Real device testing:
   - iPhone 12 (Safari)
   - Pixel 6 (Chrome)
   - MacBook Air M1 (Safari)
   - Windows laptop with integrated GPU

## Todo List
- [ ] Install detect-gpu
- [ ] Rewrite use-gpu-tier.ts
- [ ] Update scene with tier config
- [ ] Chrome DevTools performance test
- [ ] Lighthouse audit
- [ ] Bundle size verification
- [ ] Mobile device testing
- [ ] Reduced motion testing
- [ ] Document tier thresholds

## Success Criteria
- GPU tier accurately detected
- Tier 3: all features, 60fps
- Tier 2: reduced features, 45+ fps
- Tier 1: minimal 3D, 30+ fps
- Tier 0: CSS fallback, no jank
- Lighthouse Performance > 90
- No console errors/warnings

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| detect-gpu async delay | Show loading state, default to tier 2 |
| False tier detection | Manual override in dev tools for testing |
| Bundle bloat | Verify tree-shaking, consider dynamic import |

## Security Considerations
- detect-gpu fingerprints GPU (privacy note in docs)
- No sensitive data exposed

## Next Steps
- Deploy to staging for real-world testing
- A/B test with analytics (conversion impact)
- Consider V3: custom dissolve shader
