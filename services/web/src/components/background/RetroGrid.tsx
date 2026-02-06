import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Component: Starfield
// Renders a field of particles that slowly rotate
// -----------------------------------------------------------------------------
function Starfield(props: any) {
  const ref = useRef<any>();

  // Generate random positions for stars
  const sphere = useMemo(() => {
    const temp = new Float32Array(5000 * 3); // 5000 stars
    for (let i = 0; i < 5000; i++) {
      const r = 1.5; // Radius
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      temp[i * 3] = x;
      temp[i * 3 + 1] = y;
      temp[i * 3 + 2] = z;
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#00ff41" // Neon Green
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.4}
        />
      </Points>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Component: RetroGridBackground
// The main exported component that wraps the Canvas
// -----------------------------------------------------------------------------
export const RetroGridBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-terminal-black">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Starfield />
        {/* We can add a Grid helper here later if needed */}
      </Canvas>
      {/* Overlay to dim the stars slightly */}
      <div className="absolute inset-0 bg-terminal-black/60 pointer-events-none" />
    </div>
  );
};
