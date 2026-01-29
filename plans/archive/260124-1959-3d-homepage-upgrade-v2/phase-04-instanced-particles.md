# Phase 4: Instanced Particles

## Context Links
- [R3F Advanced Patterns](../reports/researcher-03-r3f-advanced-260124-1945.md) - Instances from drei
- [3D Techniques for SaaS](../reports/researcher-02-3d-techniques-saas-260124-1945.md) - 10k+ particles

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | pending |
| Effort | 2.5h |

Convert `Points` to `InstancedMesh` for 1000+ particles with single draw call. Enables per-particle transforms and custom materials.

## Key Insights
- `Points` limited: no per-particle rotation, size variation, custom geometry
- `InstancedMesh` renders N objects in 1 draw call
- drei's `<Instances>` + `<Instance>` is declarative wrapper
- For 1000+ particles, use raw `THREE.InstancedMesh` with matrix updates
- Can use custom shader material with instance attributes

## Requirements
### Functional
- Render 1000 particles on high-tier, 300 on medium, 100 on low
- Per-particle: position, scale, opacity variation
- Smooth animation (rotation, float)

### Non-Functional
- Single draw call for all particles
- 60fps on medium-tier devices
- Memory stable (no GC spikes)

## Architecture
```
InstancedMesh (count=1000)
├── geometry: sphereGeometry(0.02, 8, 8)
├── material: custom shader with instance opacity
└── useFrame: update instance matrices
```

## Related Code Files
### Modify
- `services/web/src/components/three-d/ephemeral-particles.tsx` (full rewrite)

### Create
- `services/web/src/components/three-d/instanced-particles.tsx`
- `services/web/src/components/three-d/shaders/particle-material.ts` (optional)

## Implementation Steps
1. Create `instanced-particles.tsx`:
   ```tsx
   import { useRef, useMemo } from 'react'
   import { useFrame } from '@react-three/fiber'
   import * as THREE from 'three'

   interface InstancedParticlesProps {
     count?: number
     animate?: boolean
   }

   export function InstancedParticles({ count = 1000, animate = true }: InstancedParticlesProps) {
     const meshRef = useRef<THREE.InstancedMesh>(null)
     const dummy = useMemo(() => new THREE.Object3D(), [])

     // Pre-compute initial positions and velocities
     const particles = useMemo(() => {
       return Array.from({ length: count }, () => ({
         position: new THREE.Vector3(
           (Math.random() - 0.5) * 10,
           (Math.random() - 0.5) * 10,
           (Math.random() - 0.5) * 10
         ),
         scale: 0.5 + Math.random() * 0.5,
         speed: 0.2 + Math.random() * 0.3,
         offset: Math.random() * Math.PI * 2
       }))
     }, [count])

     useFrame((state) => {
       if (!meshRef.current || !animate) return

       particles.forEach((p, i) => {
         // Gentle floating motion
         dummy.position.copy(p.position)
         dummy.position.y += Math.sin(state.clock.elapsedTime * p.speed + p.offset) * 0.1
         dummy.scale.setScalar(p.scale * 0.03)
         dummy.updateMatrix()
         meshRef.current!.setMatrixAt(i, dummy.matrix)
       })

       meshRef.current.instanceMatrix.needsUpdate = true
     })

     return (
       <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
         <sphereGeometry args={[1, 8, 8]} />
         <meshStandardMaterial
           color="#8b5cf6"
           emissive="#8b5cf6"
           emissiveIntensity={1.2}
           transparent
           opacity={0.7}
         />
       </instancedMesh>
     )
   }
   ```

2. Integrate mouse repulsion from Phase 2:
   - Store positions in Float32Array for direct manipulation
   - Update particle objects, then rebuild matrices

3. Integrate scroll animation from Phase 3:
   - Apply global y-offset to all particle positions
   - Modulate material opacity via uniform

4. Update `landing-hero-3d-scene.tsx`:
   - Replace `<EphemeralParticles>` with `<InstancedParticles>`
   - Pass count based on GPU tier

5. Optional: custom shader material for per-instance opacity:
   ```glsl
   attribute float instanceOpacity;
   varying float vOpacity;
   void main() {
     vOpacity = instanceOpacity;
     // ... standard vertex shader
   }
   ```

6. Performance test: measure draw calls, FPS, memory

## Todo List
- [ ] Create instanced-particles.tsx
- [ ] Pre-compute particle data arrays
- [ ] Implement matrix update loop
- [ ] Integrate mouse repulsion
- [ ] Integrate scroll animation
- [ ] Replace old component in scene
- [ ] GPU tier count adjustment
- [ ] Performance benchmark

## Success Criteria
- 1000 particles render at 60fps (high tier)
- Single draw call (verify in Spector.js)
- Mouse repulsion works
- Scroll fade works
- No GC spikes in Performance tab

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Matrix update bottleneck | Use typed arrays, avoid allocations |
| Shader complexity | Start with standard material, add custom later |
| Integration breaks | Keep old component until verified |

## Security Considerations
- None

## Next Steps
- Phase 5: Full testing and optimization pass
