# Phase 3: Scroll Animations

## Context Links
- [R3F Advanced Patterns](../reports/researcher-03-r3f-advanced-260124-1945.md) - ScrollControls
- [Top 3D Sites](../reports/researcher-01-top-3d-sites-260124-1945.md) - Apple scroll-linked

## Overview
| Field | Value |
|-------|-------|
| Priority | P2 |
| Status | pending |
| Effort | 2.5h |

Sync 3D scene with page scroll. Particles drift into "void" as user scrolls down. Camera parallax effect.

## Key Insights
- `ScrollControls` from drei handles scroll-to-offset mapping
- `useScroll().offset` returns 0-1 based on scroll position
- Can control camera, particle opacity, position simultaneously
- `damping={0.1}` for smooth easing

## Requirements
### Functional
- Particles fade and drift downward as user scrolls
- Camera subtle parallax (y-axis shift)
- Orbs scale down / fade on scroll
- Reset on scroll back to top

### Non-Functional
- No scroll hijacking (page scroll still works)
- Smooth 60fps during scroll
- Works with existing page layout

## Architecture
```
ScrollControls (pages=1, damping=0.1)
└── Scene
    ├── useScroll().offset drives:
    │   ├── particles.position.y -= offset * 3
    │   ├── particles.opacity = 1 - offset
    │   ├── orbs.scale = 1 - offset * 0.5
    │   └── camera.position.y = offset * -2
```

## Related Code Files
### Modify
- `services/web/src/components/three-d/landing-hero-3d-scene.tsx`
- `services/web/src/components/three-d/ephemeral-particles.tsx`
- `services/web/src/components/three-d/floating-orbs.tsx`

### Create
- `services/web/src/components/three-d/hooks/use-scroll-animation.ts`

## Implementation Steps
1. Create `use-scroll-animation.ts`:
   ```tsx
   import { useScroll } from '@react-three/drei'
   import { useFrame } from '@react-three/fiber'
   import { useRef } from 'react'

   export function useScrollAnimation() {
     const scroll = useScroll()
     const data = useRef({ offset: 0, velocity: 0 })

     useFrame(() => {
       const prev = data.current.offset
       data.current.offset = scroll.offset
       data.current.velocity = scroll.offset - prev
     })

     return data.current
   }
   ```

2. Wrap Canvas content with `ScrollControls`:
   ```tsx
   <ScrollControls pages={1} damping={0.1}>
     <SceneContent />
   </ScrollControls>
   ```

3. Update `ephemeral-particles.tsx`:
   - Use `useScrollAnimation` to get offset
   - In useFrame: `points.current.position.y = -offset * 3`
   - Update material opacity: `material.opacity = 0.6 * (1 - offset * 0.8)`

4. Update `floating-orbs.tsx`:
   - Scale orbs based on scroll: `scale={1 - scrollOffset * 0.4}`
   - Fade opacity

5. Add camera parallax in scene:
   ```tsx
   useFrame(() => {
     camera.position.y = scroll.offset * -1.5
   })
   ```

6. Test scroll behavior across page sections

## Todo List
- [ ] Create use-scroll-animation.ts
- [ ] Add ScrollControls wrapper
- [ ] Implement particle scroll fade
- [ ] Implement orb scroll scale
- [ ] Add camera parallax
- [ ] Test with page content
- [ ] Verify no scroll hijacking

## Success Criteria
- Particles visibly drift down on scroll
- Opacity fades to ~20% at bottom
- Orbs shrink smoothly
- Camera shifts create depth
- Page scrolls normally (no hijack)
- Smooth animation at 60fps

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Scroll hijacking | Use `pages={1}` (no extra scroll length) |
| Conflict with page | Test with real hero section content |
| Jank on fast scroll | Increase damping if needed |

## Security Considerations
- None

## Next Steps
- Phase 4: Instanced particles (can start parallel)
