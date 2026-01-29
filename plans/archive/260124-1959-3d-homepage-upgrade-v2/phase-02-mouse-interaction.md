# Phase 2: Mouse Interaction

## Context Links
- [Top 3D Sites Research](../reports/researcher-01-top-3d-sites-260124-1945.md) - Linear constellation mouse repulsion
- [3D Techniques for SaaS](../reports/researcher-02-3d-techniques-saas-260124-1945.md) - Privacy shield effect
- [ephemeral-particles.tsx](../../services/web/src/components/three-d/ephemeral-particles.tsx)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 3h |

Implement mouse-driven particle repulsion/attraction. Particles flee from cursor creating "privacy shield" effect.

## Key Insights
- R3F `useThree` gives access to `pointer` (normalized -1 to 1)
- Raycasting against invisible plane for 3D mouse position
- Repulsion formula: `force = (mousePos - particlePos).normalize() * (1 / distance^2)`
- Must update positions in `useFrame` for 60fps

## Requirements
### Functional
- Particles repel from mouse cursor within radius
- Smooth easing (particles drift back when mouse leaves)
- Optional: hold key to attract instead of repel

### Non-Functional
- No jank on 500+ particles
- Disable on mobile (touch causes jitter)
- Graceful fallback if pointer unavailable

## Architecture
```
useFrame loop:
1. Raycast mouse to invisible plane at z=0
2. For each particle in radius:
   - Calculate repulsion vector
   - Apply velocity with damping
3. Update bufferAttribute positions
```

## Related Code Files
### Modify
- `services/web/src/components/three-d/ephemeral-particles.tsx`

### Create
- `services/web/src/components/three-d/hooks/use-mouse-repulsion.ts`

## Implementation Steps
1. Create `use-mouse-repulsion.ts`:
   ```tsx
   import { useThree, useFrame } from '@react-three/fiber'
   import { useRef } from 'react'
   import * as THREE from 'three'

   export function useMouseRepulsion(
     positionsRef: React.RefObject<Float32Array>,
     velocitiesRef: React.RefObject<Float32Array>,
     count: number,
     options: { radius?: number; strength?: number; damping?: number }
   ) {
     const { pointer, camera } = useThree()
     const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
     const raycaster = useRef(new THREE.Raycaster())
     const mousePos = useRef(new THREE.Vector3())

     useFrame(() => {
       // Raycast to z=0 plane
       raycaster.current.setFromCamera(pointer, camera)
       raycaster.current.ray.intersectPlane(plane.current, mousePos.current)

       const positions = positionsRef.current
       const velocities = velocitiesRef.current
       if (!positions || !velocities) return

       for (let i = 0; i < count; i++) {
         const idx = i * 3
         const dx = positions[idx] - mousePos.current.x
         const dy = positions[idx + 1] - mousePos.current.y
         const dist = Math.sqrt(dx * dx + dy * dy)

         if (dist < options.radius && dist > 0.01) {
           const force = options.strength / (dist * dist)
           velocities[idx] += (dx / dist) * force
           velocities[idx + 1] += (dy / dist) * force
         }

         // Apply velocity with damping
         positions[idx] += velocities[idx]
         positions[idx + 1] += velocities[idx + 1]
         velocities[idx] *= options.damping
         velocities[idx + 1] *= options.damping
       }
     })
   }
   ```

2. Update `ephemeral-particles.tsx`:
   - Add `velocities` Float32Array (initialized to 0)
   - Store original positions for drift-back
   - Integrate `useMouseRepulsion` hook
   - Mark `bufferAttribute` as `needsUpdate = true` each frame

3. Add prop `enableMouseInteraction: boolean` gated by gpuTier

4. Test with 500 particles, verify no frame drops

## Todo List
- [ ] Create use-mouse-repulsion.ts hook
- [ ] Add velocities array to ephemeral-particles
- [ ] Integrate hook into particle component
- [ ] Add GPU tier gating
- [ ] Test performance with 500+ particles
- [ ] Add drift-back to original positions

## Success Criteria
- Particles visibly repel from cursor
- Smooth 60fps animation
- Particles slowly return when mouse leaves
- No effect on mobile devices
- No memory leaks (no new allocations per frame)

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Frame drops | Limit affected particles to nearest 100 |
| Memory churn | Pre-allocate all arrays in useMemo |
| Touch jitter | Disable on mobile entirely |

## Security Considerations
- None (visual-only)

## Next Steps
- Phase 3: Scroll animations can run parallel to mouse interaction
