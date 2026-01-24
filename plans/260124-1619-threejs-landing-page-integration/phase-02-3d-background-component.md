# Phase 02: 3D Background Component

## Overview
- **Priority:** P1
- **Status:** ✅ Done (2026-01-24)
- **Effort:** 6h

Create 3D background component với ephemeral particles và floating geometric shapes.

## Key Insights
- Use `frameloop="demand"` for battery efficiency
- Particles via `<Points>` with instancing
- Floating orbs với `<Float>` wrapper
- Purple/violet color scheme matching brand

## Architecture

```
services/web/src/components/three-d/
├── landing-hero-3d-scene.tsx    # Main Canvas wrapper
├── ephemeral-particles.tsx       # Particle system
├── floating-orbs.tsx             # Geometric shapes
└── index.ts                      # Exports
```

## Implementation Steps

### 1. Create Scene Wrapper
```tsx
// landing-hero-3d-scene.tsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EphemeralParticles } from './ephemeral-particles'
import { FloatingOrbs } from './floating-orbs'

export function LandingHero3DScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 45 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <EphemeralParticles count={500} />
          <FloatingOrbs />
        </Suspense>
      </Canvas>
    </div>
  )
}
```

### 2. Particle System
```tsx
// ephemeral-particles.tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function EphemeralParticles({ count = 500 }) {
  const points = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.05
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}
```

### 3. Floating Orbs
```tsx
// floating-orbs.tsx
import { Float, Sphere } from '@react-three/drei'

export function FloatingOrbs() {
  return (
    <>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[0.5, 32, 32]} position={[-2, 1, -2]}>
          <meshStandardMaterial
            color="#8b5cf6"
            roughness={0.1}
            metalness={0.8}
            transparent
            opacity={0.7}
          />
        </Sphere>
      </Float>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere args={[0.3, 32, 32]} position={[2, -1, -1]}>
          <meshStandardMaterial
            color="#a855f7"
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={0.5}
          />
        </Sphere>
      </Float>
    </>
  )
}
```

## Todo List
- [ ] Create `three-d/` directory structure
- [ ] Implement `landing-hero-3d-scene.tsx`
- [ ] Implement `ephemeral-particles.tsx`
- [ ] Implement `floating-orbs.tsx`
- [ ] Create barrel export `index.ts`
- [ ] Test render in isolation

## Success Criteria
- Scene renders without errors
- Particles animate smoothly
- Orbs float with gentle motion
- Colors match brand violet theme

## Files to Create
- `services/web/src/components/three-d/landing-hero-3d-scene.tsx`
- `services/web/src/components/three-d/ephemeral-particles.tsx`
- `services/web/src/components/three-d/floating-orbs.tsx`
- `services/web/src/components/three-d/index.ts`
