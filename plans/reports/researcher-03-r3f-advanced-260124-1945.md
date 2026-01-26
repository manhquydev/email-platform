# R3F Advanced Patterns & Effects Report

## 1. Postprocessing (@react-three/postprocessing)
Essential for "production feel". Heavy on GPU, use sparingly on mobile.

```tsx
import { EffectComposer, Bloom, Noise, ChromaticAberration } from '@react-three/postprocessing'

<EffectComposer disableNormalPass>
  <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
  <ChromaticAberration offset={[0.002, 0.002]} />
  <Noise opacity={0.05} />
</EffectComposer>
```
*Tip: `disableNormalPass` saves performance if not using SSAO/Depth effects.*

## 2. Custom Shaders (GLSL)
Use `shaderMaterial` from `drei` for declarative reuse.

```tsx
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'

const WaveMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(0.0, 0.0, 0.0) },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, // Vertex
  `uniform float uTime; varying vec2 vUv; void main() { gl_FragColor = vec4(0.5 + 0.5 * sin(uTime + vUv.x * 10.0), 0.0, 1.0, 1.0); }` // Fragment
)
extend({ WaveMaterial })

// Usage: <mesh><planeGeometry /><waveMaterial ref={ref} uColor="hotpink" /></mesh>
// Anim: useFrame((state) => (ref.current.uTime = state.clock.elapsedTime))
```

## 3. Scroll Animations (ScrollControls)
Decouple 3D camera/object movement from DOM scroll.

```tsx
import { ScrollControls, useScroll } from '@react-three/drei'

function Scene() {
  const scroll = useScroll()
  useFrame(() => {
    // scroll.offset = 0 to 1
    camera.position.y = scroll.offset * -10
  })
  return <mesh ... />
}

// Wrap in Canvas: <ScrollControls pages={3} damping={0.1}><Scene /></ScrollControls>
```

## 4. Performance Patterns
**Instancing**: Render 1000s of objects with 1 draw call.
```tsx
import { Instances, Instance } from '@react-three/drei'

<Instances range={1000}>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map((data, i) => <Instance key={i} position={data.pos} />)}
</Instances>
```
**LOD (Level of Detail)**:
```tsx
import { Detailed } from '@react-three/drei'
<Detailed distances={[0, 10, 20]}>
  <mesh geometry={highPoly} />
  <mesh geometry={lowPoly} />
</Detailed>
```

## 5. Mouse Interactions
Native R3F pointer events are optimized.
```tsx
<mesh
  onPointerOver={(e) => document.body.style.cursor = 'pointer'}
  onPointerOut={(e) => document.body.style.cursor = 'auto'}
  onClick={(e) => console.log('clicked')}
>
```
*Mobile:* Map `onPointerDown` to click logic. Use `bvh` (Bounding Volume Hierarchy) for complex raycasting.

## Unresolved Questions
- Specific strict budget for mobile FPS (e.g., 30 vs 60)?
- Should we use `gl-react` for any 2D effects mixing?
