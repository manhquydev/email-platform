/**
 * Landing Hero 3D Scene
 * Main Canvas wrapper for the landing page 3D background
 */
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EphemeralParticles } from './ephemeral-particles'
import { FloatingOrbs } from './floating-orbs'

interface LandingHero3DSceneProps {
    /** Reduced motion mode - fewer particles, no animation */
    reducedMotion?: boolean
}

export function LandingHero3DScene({
    reducedMotion = false
}: LandingHero3DSceneProps) {
    return (
        <div className="absolute inset-0 -z-10">
            <Canvas
                frameloop="always"
                dpr={[1, 2]}
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <Suspense fallback={null}>
                    {/* Ambient lighting */}
                    <ambientLight intensity={0.3} />

                    {/* Key light from top-right */}
                    <pointLight
                        position={[10, 10, 10]}
                        intensity={0.5}
                        color="#ffffff"
                    />

                    {/* Accent light from bottom-left */}
                    <pointLight
                        position={[-5, -5, 5]}
                        intensity={0.2}
                        color="#8b5cf6"
                    />

                    {/* Particle system */}
                    <EphemeralParticles
                        count={reducedMotion ? 100 : 500}
                        animate={!reducedMotion}
                    />

                    {/* Floating geometric shapes */}
                    <FloatingOrbs reducedMotion={reducedMotion} />
                </Suspense>
            </Canvas>
        </div>
    )
}
