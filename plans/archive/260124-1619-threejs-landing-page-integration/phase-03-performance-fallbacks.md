# Phase 03: Performance & Fallbacks

## Overview
- **Priority:** P1
- **Status:** ✅ Done (2026-01-24)
- **Effort:** 4h

Implement performance optimizations và fallback strategies cho mobile/low-end devices.

## Key Insights
- Cap `devicePixelRatio` at 2
- Use GPU tier detection
- Lazy load 3D scene
- Fallback to CSS effects on mobile

## Implementation Steps

### 1. GPU Tier Detection Hook
```tsx
// hooks/use-gpu-tier.ts
import { useState, useEffect } from 'react'

export type GPUTier = 'high' | 'medium' | 'low' | 'unknown'

export function useGPUTier(): GPUTier {
  const [tier, setTier] = useState<GPUTier>('unknown')

  useEffect(() => {
    // Simple heuristic based on device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const hasWebGL2 = !!document.createElement('canvas')
      .getContext('webgl2')

    if (isMobile) {
      setTier('low')
    } else if (hasWebGL2) {
      setTier('high')
    } else {
      setTier('medium')
    }
  }, [])

  return tier
}
```

### 2. Lazy 3D Scene Wrapper
```tsx
// components/three-d/lazy-landing-scene.tsx
import { lazy, Suspense } from 'react'
import { useGPUTier } from '../../hooks/use-gpu-tier'

const LandingHero3DScene = lazy(() =>
  import('./landing-hero-3d-scene').then(m => ({
    default: m.LandingHero3DScene
  }))
)

export function LazyLanding3DScene() {
  const tier = useGPUTier()

  // Fallback for low-end devices
  if (tier === 'low') {
    return <CSSFallbackBackground />
  }

  return (
    <Suspense fallback={<CSSFallbackBackground />}>
      <LandingHero3DScene />
    </Suspense>
  )
}

function CSSFallbackBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }} />
    </div>
  )
}
```

### 3. Reduced Motion Support
```tsx
// In landing-hero-3d-scene.tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// Pass to components
<EphemeralParticles
  count={prefersReducedMotion ? 100 : 500}
  animate={!prefersReducedMotion}
/>
```

### 4. Performance Monitor (Dev Only)
```tsx
import { Perf } from 'r3f-perf'

// Inside Canvas, dev only
{import.meta.env.DEV && <Perf position="top-left" />}
```

## Todo List
- [ ] Create `use-gpu-tier.ts` hook
- [ ] Create `lazy-landing-scene.tsx`
- [ ] Add CSS fallback component
- [ ] Implement reduced motion support
- [ ] Add dev performance monitor
- [ ] Test on mobile devices

## Success Criteria
- Mobile devices get CSS fallback
- Desktop maintains 60 FPS
- `prefers-reduced-motion` respected
- Lazy loading works correctly

## Files to Create/Modify
- `services/web/src/hooks/use-gpu-tier.ts`
- `services/web/src/components/three-d/lazy-landing-scene.tsx`
- `services/web/src/components/three-d/landing-hero-3d-scene.tsx`
