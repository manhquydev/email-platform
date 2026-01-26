# Research: React Three Fiber Integration with React 19

## 1. Executive Summary
Integration of 3D elements in a React 19 environment requires specific major versions of the React Three Fiber ecosystem. **R3F v8 is incompatible with React 19.**

- **Core**: `@react-three/fiber` **v9** is required.
- **Utilities**: `@react-three/drei` **v10** is required.

## 2. Installation
React 19 support is available in the latest major versions (often tagged as `beta` or `rc` if not yet GA).

```bash
# Core dependencies
npm install three @types/three

# React 19 compatible versions
npm install @react-three/fiber@latest @react-three/drei@latest
# OR if latest is still v8/v9:
# npm install @react-three/fiber@beta @react-three/drei@beta
```

## 3. Basic Setup Pattern
R3F v9 maintains the declarative API while handling React 19's concurrent rendering internally.

```tsx
import { Canvas } from '@react-three/fiber'
import { Environment, Float } from '@react-three/drei'

export function LandingHero3D() {
  return (
    // Container must have defined height/width (e.g., via Tailwind)
    <div className="absolute inset-0 -z-10">
      <Canvas resize={{ scroll: false }}>
        <ambientLight intensity={0.5} />
        <Float speed={2} rotationIntensity={1}>
          <mesh>
            <torusKnotGeometry args={[1, 0.3, 128, 16]} />
            <meshStandardMaterial color="#4f46e5" roughness={0.1} />
          </mesh>
        </Float>
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
```

## 4. Key Gotchas with React 19
1.  **Internal API Changes**: R3F v9 removed legacy internal properties (like `.__r3f`). Any custom libraries relying on internals of v8 will break.
2.  **Ref Cleanup**: React 19 strictly enforces ref cleanup functions. Ensure `useEffect` in custom 3D components returns proper cleanup.
3.  **Strict Mode**: React 19's double-mount in Strict Mode is aggressive; ensure 3D scene side-effects (like texture loaders) are properly cached (R3F handles this auto-magically for built-in loaders).
4.  **Hydration**: If using SSR (not applicable to pure Vite SPA, but good to know), wrap Canvas in a client-only component/suspense boundary.

## 5. Performance Considerations
1.  **On-Demand Rendering**: For landing pages, use `frameloop="demand"` to render only on interaction/state change, saving user battery.
    ```tsx
    <Canvas frameloop="demand" ... />
    ```
2.  **Drei Performance**:
    - Use `<Instances>` for repeating identical geometries (extremely important for particle systems).
    - Use `<BakeShadows>` if shadows are static.
3.  **Bundle Size**: Tailwind and Three.js work well, but Three.js is large. Ensure tree-shaking works by importing only needed parts of `three` if doing custom logic, though R3F handles most via `@react-three/drei`.

## 6. Recommended Packages
- **@react-three/drei**: Essential abstractions (Controls, Environment, Loaders).
- **lamina**: Layer-based shader materials (great for backgrounds).
- **maath**: Math helpers often needed for 3D logic.
- **leva**: GUI controls for debugging 3D scenes during dev (remove in prod).

## Unresolved Questions
- Does the project require complex physics? (If so, `@react-three/rapier` compatibility with React 19 needs separate verification).
- Are high-fidelity shadows required? (Impacts performance strategy).
