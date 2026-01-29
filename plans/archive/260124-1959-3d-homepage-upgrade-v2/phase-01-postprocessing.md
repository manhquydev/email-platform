# Phase 1: Postprocessing Effects

## Context Links
- [R3F Advanced Patterns](../reports/researcher-03-r3f-advanced-260124-1945.md)
- [landing-hero-3d-scene.tsx](../../services/web/src/components/three-d/landing-hero-3d-scene.tsx)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 2h |

Add `@react-three/postprocessing` with Bloom, ChromaticAberration, Noise effects. GPU-tier gated.

## Key Insights
- `disableNormalPass` saves perf if not using SSAO
- Bloom `luminanceThreshold={1}` only blooms bright objects (emissive > 1)
- ChromaticAberration offset `[0.002, 0.002]` is subtle; higher = more "glitchy"
- Noise opacity 0.03-0.05 adds film grain without distraction

## Requirements
### Functional
- Bloom effect on particles and orbs
- Subtle chromatic aberration at screen edges
- Film grain noise overlay
- Disable all effects when `reducedMotion=true`

### Non-Functional
- No effect on GPU tier "low" (mobile)
- Maintain 60fps on tier "medium"
- Bundle increase < 60KB gzipped

## Architecture
```
Canvas
└── EffectComposer (conditional on gpuTier >= medium)
    ├── Bloom
    ├── ChromaticAberration
    └── Noise
```

## Related Code Files
### Modify
- `services/web/src/components/three-d/landing-hero-3d-scene.tsx`
- `services/web/package.json` (add dependency)

### Create
- `services/web/src/components/three-d/postprocessing-effects.tsx`

## Implementation Steps
1. Install dependency:
   ```bash
   cd services/web && npm install @react-three/postprocessing postprocessing
   ```

2. Create `postprocessing-effects.tsx`:
   ```tsx
   import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing'
   import { BlendFunction } from 'postprocessing'

   interface PostprocessingEffectsProps {
     enabled?: boolean
   }

   export function PostprocessingEffects({ enabled = true }: PostprocessingEffectsProps) {
     if (!enabled) return null

     return (
       <EffectComposer disableNormalPass>
         <Bloom
           luminanceThreshold={0.9}
           luminanceSmoothing={0.4}
           mipmapBlur
           intensity={1.2}
         />
         <ChromaticAberration
           offset={[0.0015, 0.0015]}
           blendFunction={BlendFunction.NORMAL}
         />
         <Noise
           opacity={0.04}
           blendFunction={BlendFunction.OVERLAY}
         />
       </EffectComposer>
     )
   }
   ```

3. Update `landing-hero-3d-scene.tsx`:
   - Import `PostprocessingEffects`
   - Add prop `gpuTier: GPUTier`
   - Render `<PostprocessingEffects enabled={gpuTier !== 'low' && !reducedMotion} />`

4. Update particle/orb materials:
   - Add `emissive="#8b5cf6"` and `emissiveIntensity={1.2}` to make Bloom visible

5. Test on Chrome DevTools device emulation (throttle GPU)

## Todo List
- [ ] Install @react-three/postprocessing
- [ ] Create postprocessing-effects.tsx
- [ ] Integrate into landing-hero-3d-scene.tsx
- [ ] Add emissive to materials
- [ ] Test GPU tier gating
- [ ] Verify bundle size increase

## Success Criteria
- Bloom glow visible on particles/orbs
- Subtle chromatic aberration at edges
- Film grain overlay active
- No effects on mobile (tier=low)
- 60fps maintained on medium-tier laptop

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Bundle bloat | Tree-shake unused effects; verify < 60KB |
| Mobile crash | Strict tier gating; test on real device |
| Over-bloom | Tune luminanceThreshold; A/B test |

## Security Considerations
- None (visual-only, no data handling)

## Next Steps
- Phase 2: Mouse interaction depends on particle system being visually finalized
