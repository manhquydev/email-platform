import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Wireframe } from '@react-three/drei';
import * as THREE from 'three';

function RotatingIcosahedron() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.2;
    ref.current.rotation.x = Math.sin(t * 0.5) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={ref} scale={2}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#39ff14" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh scale={2.05}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.1} />
      </mesh>
    </Float>
  );
}

export const HeroScene: React.FC = () => {
  return (
    <div className="w-full h-[400px] md:h-[500px] relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <RotatingIcosahedron />
      </Canvas>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <div className="text-center space-y-4 bg-terminal-black/60 p-8 backdrop-blur-sm border border-neon-green/20 rounded-lg">
            <h1 className="text-4xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-cyan tracking-tight drop-shadow-glow">
                EPHEMERA
            </h1>
            <p className="text-phosphor-dim font-mono max-w-md mx-auto">
                SECURE // ANONYMOUS // DISPOSABLE
                <br />
                <span className="text-xs text-phosphor-faint mt-2 block">
                    ESTABLISHED CONNECTION TO PORT 25
                </span>
            </p>
        </div>
      </div>
    </div>
  );
};
